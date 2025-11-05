import pandas as pd

df = pd.read_csv('educational_youtube_content.csv')

print('='*70)
print('CSV DATASET ANALYSIS')
print('='*70)
print(f'\nTotal videos: {len(df):,}')
print(f'Total genres: {df["genre"].nunique()}')
print(f'Quality videos (score > 0.7): {len(df[df["quality_score"] > 0.7]):,}')

print(f'\n{"="*70}')
print(f'ALL {df["genre"].nunique()} GENRES WITH VIDEO COUNTS:')
print('='*70)

for idx, (genre, count) in enumerate(df['genre'].value_counts().items(), 1):
    print(f'{idx:2}. {genre:35} {count:6,} videos')

print('\n' + '='*70)
print('SAMPLE DATA STRUCTURE:')
print('='*70)
print(df.head(3)[['video_id', 'title', 'genre', 'channel_name', 'quality_score', 'view_count']].to_string())
