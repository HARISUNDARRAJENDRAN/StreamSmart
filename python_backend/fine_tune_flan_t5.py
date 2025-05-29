#!/usr/bin/env python3
"""
Fine-tuning script for FLAN-T5 model for multi-modal video summarization.
This script allows you to fine-tune the FLAN-T5 model on your specific dataset
to improve performance for educational video content analysis.
"""

import argparse
import json
import logging
import os
from typing import List, Dict, Any
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    T5Tokenizer, 
    T5ForConditionalGeneration,
    Trainer,
    TrainingArguments,
    DataCollatorForSeq2Seq
)
from datasets import Dataset as HFDataset
import numpy as np
from sklearn.model_selection import train_test_split

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VideoSummaryDataset(Dataset):
    """
    Custom dataset for video summarization fine-tuning
    """
    
    def __init__(self, data: List[Dict[str, str]], tokenizer: T5Tokenizer, max_input_length: int = 1024, max_target_length: int = 512):
        self.data = data
        self.tokenizer = tokenizer
        self.max_input_length = max_input_length
        self.max_target_length = max_target_length
    
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        item = self.data[idx]
        
        # Prepare input text
        input_text = f"Summarize this multi-modal video content: {item['input']}"
        target_text = item['target']
        
        # Tokenize input
        input_encoding = self.tokenizer(
            input_text,
            max_length=self.max_input_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        
        # Tokenize target
        target_encoding = self.tokenizer(
            target_text,
            max_length=self.max_target_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )
        
        return {
            'input_ids': input_encoding['input_ids'].flatten(),
            'attention_mask': input_encoding['attention_mask'].flatten(),
            'labels': target_encoding['input_ids'].flatten()
        }

def load_training_data(data_path: str) -> List[Dict[str, str]]:
    """
    Load training data from JSON file
    Expected format:
    [
        {
            "input": "transcript + visual insights + context",
            "target": "ideal summary"
        },
        ...
    ]
    """
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        logger.info(f"Loaded {len(data)} training examples from {data_path}")
        return data
    
    except Exception as e:
        logger.error(f"Error loading training data: {e}")
        raise

def prepare_dataset(data: List[Dict[str, str]], tokenizer: T5Tokenizer, test_size: float = 0.2):
    """
    Prepare training and validation datasets
    """
    # Split the data
    train_data, val_data = train_test_split(data, test_size=test_size, random_state=42)
    
    logger.info(f"Training examples: {len(train_data)}")
    logger.info(f"Validation examples: {len(val_data)}")
    
    # Create datasets
    train_dataset = VideoSummaryDataset(train_data, tokenizer)
    val_dataset = VideoSummaryDataset(val_data, tokenizer)
    
    return train_dataset, val_dataset

def compute_metrics(eval_pred):
    """
    Compute evaluation metrics
    """
    predictions, labels = eval_pred
    
    # Decode predictions and labels
    decoded_preds = tokenizer.batch_decode(predictions, skip_special_tokens=True)
    labels = np.where(labels != -100, labels, tokenizer.pad_token_id)
    decoded_labels = tokenizer.batch_decode(labels, skip_special_tokens=True)
    
    # Simple length-based metrics (you can add ROUGE, BLEU, etc.)
    pred_lens = [len(pred.split()) for pred in decoded_preds]
    label_lens = [len(label.split()) for label in decoded_labels]
    
    return {
        'avg_pred_length': np.mean(pred_lens),
        'avg_label_length': np.mean(label_lens),
    }

def create_sample_data(output_path: str, num_samples: int = 50):
    """
    Create sample training data for demonstration
    """
    sample_data = []
    
    for i in range(num_samples):
        # Generate synthetic training examples
        input_text = f"""
        Video Title: Programming Tutorial {i+1}
        Transcript: This video covers fundamental programming concepts including variables, functions, and object-oriented programming. 
        The instructor demonstrates coding examples and explains key principles step by step.
        
        Visual Analysis: Video contains {20 + i} key frames showing code examples, diagrams, and demonstrations. 
        High visual activity detected with frequent screen changes showing different code snippets.
        
        Timestamp Highlights:
        - 30s: Introduction to variables
        - 120s: Function definitions
        - 240s: OOP concepts demonstration
        
        Multi-modal Alignment Score: {0.7 + (i % 3) * 0.1:.1f}
        """
        
        target_text = f"""
        This programming tutorial provides a comprehensive introduction to fundamental concepts. 
        The video demonstrates variables, functions, and object-oriented programming through practical coding examples. 
        Visual content includes {20 + i} instructional frames with code demonstrations and diagrams. 
        Key topics covered include variable declaration, function implementation, and OOP principles with clear visual demonstrations.
        """
        
        sample_data.append({
            'input': input_text.strip(),
            'target': target_text.strip()
        })
    
    # Save sample data
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(sample_data, f, indent=2, ensure_ascii=False)
    
    logger.info(f"Created {num_samples} sample training examples at {output_path}")

def fine_tune_model(
    model_name: str,
    data_path: str,
    output_dir: str,
    num_epochs: int = 3,
    batch_size: int = 4,
    learning_rate: float = 5e-5,
    max_input_length: int = 1024,
    max_target_length: int = 512
):
    """
    Fine-tune FLAN-T5 model on video summarization data
    """
    # Set device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"Using device: {device}")
    
    # Load tokenizer and model
    logger.info(f"Loading model: {model_name}")
    tokenizer = T5Tokenizer.from_pretrained(model_name)
    model = T5ForConditionalGeneration.from_pretrained(model_name)
    
    # Make tokenizer available globally for metrics
    globals()['tokenizer'] = tokenizer
    
    # Load and prepare data
    training_data = load_training_data(data_path)
    train_dataset, val_dataset = prepare_dataset(training_data, tokenizer)
    
    # Create data collator
    data_collator = DataCollatorForSeq2Seq(
        tokenizer=tokenizer,
        model=model,
        padding=True,
        return_tensors='pt'
    )
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=num_epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=learning_rate,
        weight_decay=0.01,
        logging_dir=f"{output_dir}/logs",
        logging_steps=10,
        eval_steps=50,
        evaluation_strategy="steps",
        save_steps=100,
        save_total_limit=3,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        warmup_steps=100,
        fp16=torch.cuda.is_available(),  # Use mixed precision if GPU available
        dataloader_pin_memory=False,
        remove_unused_columns=False,
    )
    
    # Create trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        data_collator=data_collator,
        compute_metrics=compute_metrics,
    )
    
    # Start training
    logger.info("Starting fine-tuning...")
    trainer.train()
    
    # Save final model
    logger.info(f"Saving fine-tuned model to {output_dir}")
    trainer.save_model()
    tokenizer.save_pretrained(output_dir)
    
    # Evaluate final model
    logger.info("Evaluating final model...")
    eval_results = trainer.evaluate()
    
    logger.info("Fine-tuning completed!")
    logger.info(f"Final evaluation results: {eval_results}")
    
    return trainer, eval_results

def test_fine_tuned_model(model_path: str, test_input: str):
    """
    Test the fine-tuned model with a sample input
    """
    logger.info(f"Testing fine-tuned model from {model_path}")
    
    # Load fine-tuned model
    tokenizer = T5Tokenizer.from_pretrained(model_path)
    model = T5ForConditionalGeneration.from_pretrained(model_path)
    
    # Prepare input
    input_text = f"Summarize this multi-modal video content: {test_input}"
    inputs = tokenizer(input_text, return_tensors="pt", max_length=1024, truncation=True)
    
    # Generate summary
    with torch.no_grad():
        outputs = model.generate(
            inputs.input_ids,
            max_length=512,
            min_length=50,
            length_penalty=2.0,
            num_beams=4,
            early_stopping=True
        )
    
    # Decode output
    summary = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    logger.info("Generated Summary:")
    logger.info(summary)
    
    return summary

def main():
    parser = argparse.ArgumentParser(description="Fine-tune FLAN-T5 for multi-modal video summarization")
    parser.add_argument("--model_name", default="google/flan-t5-base", help="Base model name")
    parser.add_argument("--data_path", required=True, help="Path to training data JSON file")
    parser.add_argument("--output_dir", required=True, help="Output directory for fine-tuned model")
    parser.add_argument("--num_epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=4, help="Training batch size")
    parser.add_argument("--learning_rate", type=float, default=5e-5, help="Learning rate")
    parser.add_argument("--create_sample_data", action="store_true", help="Create sample training data")
    parser.add_argument("--test_model", action="store_true", help="Test the fine-tuned model")
    
    args = parser.parse_args()
    
    # Create sample data if requested
    if args.create_sample_data:
        sample_data_path = "sample_training_data.json"
        create_sample_data(sample_data_path, num_samples=100)
        logger.info(f"Sample data created at {sample_data_path}")
        logger.info("You can now use this data for fine-tuning with:")
        logger.info(f"python fine_tune_flan_t5.py --data_path {sample_data_path} --output_dir ./fine_tuned_model")
        return
    
    # Check if data file exists
    if not os.path.exists(args.data_path):
        logger.error(f"Data file not found: {args.data_path}")
        logger.info("Use --create_sample_data to generate sample training data")
        return
    
    # Create output directory
    os.makedirs(args.output_dir, exist_ok=True)
    
    # Fine-tune the model
    trainer, eval_results = fine_tune_model(
        model_name=args.model_name,
        data_path=args.data_path,
        output_dir=args.output_dir,
        num_epochs=args.num_epochs,
        batch_size=args.batch_size,
        learning_rate=args.learning_rate
    )
    
    # Test the model if requested
    if args.test_model:
        test_input = """
        Video Title: Introduction to Machine Learning
        Transcript: This video introduces machine learning concepts including supervised and unsupervised learning.
        Visual Analysis: Contains 45 frames with charts, graphs, and algorithm demonstrations.
        Timestamp Highlights: 60s: ML overview, 180s: supervised learning, 300s: unsupervised learning
        """
        test_fine_tuned_model(args.output_dir, test_input)

if __name__ == "__main__":
    main() 