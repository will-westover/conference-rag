"""
Step 3: Import Talk Data to Supabase
======================================
Reads scripts/output/talks.json, splits each talk into sentences,
imports the text records to Supabase (without embeddings), and
saves the sentence records locally for the embedding step.

After this step, KEYWORD SEARCH will light up green on your site!
Embeddings are added in the next step to enable semantic search.

Usage:
    python scripts/03_import_data.py

Input:
    scripts/output/talks.json  — from Step 2 (scraping)

Output:
    scripts/output/sentences.json  — sentence records with talk_id + sentence_num

Prerequisites:
    - config.public.json with Supabase URL and anon key
    - config.secret.json with Supabase service key
    - Database schema created (Step 1)
    - Talks scraped (Step 2)
"""

import json
import os
import re
import sys
import time
import uuid

from supabase import create_client
from tqdm import tqdm


INPUT_FILE = os.path.join('scripts', 'output', 'talks.json')
OUTPUT_FILE = os.path.join('scripts', 'output', 'sentences.json')
BATCH_SIZE = 100


def load_config():
    with open('config.public.json', 'r') as f:
        public_config = json.load(f)
    with open('config.secret.json', 'r') as f:
        secrets = json.load(f)
    return public_config, secrets


# Chunk size limits in characters (~4 chars per token, so roughly 75–250 tokens per chunk)
MIN_CHUNK_CHARS = 300   # shorter paragraphs get merged with the next one ("Children: \u201cYes.\u201d" alone means nothing)
MAX_CHUNK_CHARS = 1000  # longer paragraphs get split at sentence boundaries

# A sentence ends at . ! or ?, optionally followed by a closing quote/paren, then whitespace and a capital letter
# (or an opening quote). Unlike the original "\. (?=[A-Z])" split, this handles ? ! and quoted scripture.
SENTENCE_END = re.compile(r'(?<=[.!?])[\u201d"\u2019)]?\s+(?=[\u201c"\u2018(]?[A-Z0-9])')


def split_into_sentences(text):
    """Split a paragraph into sentences, keeping closing quotes attached to their sentence."""
    parts, start = [], 0
    for match in SENTENCE_END.finditer(text):
        end = match.start() + len(match.group().rstrip())  # include the closing quote, drop the whitespace
        parts.append(text[start:end].strip())
        start = match.end()
    parts.append(text[start:].strip())
    return [p for p in parts if p]


def pack(pieces, separator):
    """Greedily join consecutive pieces into chunks of at most MAX_CHUNK_CHARS."""
    chunks, current = [], ''
    for piece in pieces:
        if current and len(current) + len(separator) + len(piece) > MAX_CHUNK_CHARS:
            chunks.append(current)
            current = piece
        else:
            current = f'{current}{separator}{piece}' if current else piece
    if current:
        chunks.append(current)
    return chunks


def chunk_talk(text):
    """Split a talk into retrieval chunks that follow the speaker's own paragraphs.

    1. Paragraphs longer than MAX_CHUNK_CHARS are split into sentence groups.
    2. Consecutive short paragraphs are merged until a chunk reaches MIN_CHUNK_CHARS.
    3. A short leftover at the end of the talk is merged into the previous chunk if it fits.
    """
    pieces = []
    for paragraph in text.split('\n\n'):
        if len(paragraph) > MAX_CHUNK_CHARS:
            pieces.extend(pack(split_into_sentences(paragraph), ' '))
        else:
            pieces.append(paragraph)

    chunks, current = [], ''
    for piece in pieces:
        if current and len(current) + 2 + len(piece) > MAX_CHUNK_CHARS:
            chunks.append(current)
            current = ''
        current = f'{current}\n\n{piece}' if current else piece
        if len(current) >= MIN_CHUNK_CHARS:
            chunks.append(current)
            current = ''
    if current:
        if chunks and len(chunks[-1]) + 2 + len(current) <= MAX_CHUNK_CHARS:
            chunks[-1] = f'{chunks[-1]}\n\n{current}'
        else:
            chunks.append(current)
    return chunks


def main():
    if not os.path.exists(INPUT_FILE):
        print(f"❌ {INPUT_FILE} not found. Run scripts/02_scrape_data.py first.")
        sys.exit(1)

    # Load talks
    print("=" * 60)
    print("Importing Talk Data to Supabase")
    print("=" * 60)

    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        talks = json.load(f)
    print(f"   Loaded {len(talks)} talks\n")

    # Split into chunk records (no embeddings yet). The table is still called sentence_embeddings and the
    # position column sentence_num, so the app needs no changes; each row is now a paragraph-based chunk.
    print("Splitting talks into paragraph chunks...")
    sentence_records = []
    for talk in tqdm(talks, desc="Splitting"):
        talk_id = str(uuid.uuid4())
        chunks = chunk_talk(talk['text'])
        for i, chunk in enumerate(chunks, 1):
            sentence_records.append({
                'talk_id': talk_id,
                'title': talk['title'],
                'speaker': talk['speaker'],
                'calling': talk['calling'],
                'year': int(talk['year']) if talk['year'] else None,
                'season': talk['season'],
                'url': talk['url'],
                'sentence_num': i,
                'text': chunk
                # No 'embedding' field — added in next step
            })

    print(f"✅ Split {len(talks)} talks into {len(sentence_records):,} chunks")
    print(f"   Average: {len(sentence_records) / len(talks):.1f} chunks per talk\n")

    # Save sentences locally (for embedding step to use)
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(sentence_records, f, ensure_ascii=False)
    file_size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"💾 Saved {len(sentence_records):,} sentences to {OUTPUT_FILE} ({file_size_mb:.1f} MB)")

    # Connect to Supabase
    public_config, secrets = load_config()
    client = create_client(public_config['SUPABASE_URL'], secrets['SUPABASE_SERVICE_KEY'])

    # Check for existing data and truncate if needed
    print("\n" + "=" * 60)
    print("Checking for existing data...")
    print("=" * 60)

    try:
        result = client.table('sentence_embeddings').select('id', count='exact').limit(1).execute()
        existing_count = result.count or 0
        if existing_count > 0:
            print(f"   Found {existing_count:,} existing rows. Truncating table...")
            client.table('sentence_embeddings').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
            print("   ✅ Table truncated.")
        else:
            print("   Table is empty — ready for import.")
    except Exception as e:
        print(f"   ⚠️ Could not check existing data: {e}")
        print("   Proceeding with import anyway...")

    # Import in batches
    print("\n" + "=" * 60)
    print(f"Importing {len(sentence_records):,} records to Supabase")
    print("=" * 60)
    print("   (Text only — embeddings will be added in the next step)\n")

    success = 0
    errors = 0

    for i in tqdm(range(0, len(sentence_records), BATCH_SIZE), desc="Importing"):
        batch = sentence_records[i:i + BATCH_SIZE]
        try:
            client.table('sentence_embeddings').insert(batch).execute()
            success += len(batch)
        except Exception as e:
            print(f"\nError at batch {i // BATCH_SIZE}: {e}")
            errors += len(batch)
        time.sleep(0.1)

    print(f"\n✅ Import complete!")
    print(f"   Success: {success:,}")
    if errors:
        print(f"   Errors:  {errors:,}")

    # Final verification
    result = client.table('sentence_embeddings').select('id', count='exact').limit(1).execute()
    print(f"\n   Total rows in database: {result.count or 0:,}")

    print(f"\n🎉 Keyword Search is now ready!")
    print(f"   Refresh your site — the 🔍 Keyword Search panel should turn GREEN.")
    print(f"\nNext: python scripts/04_embed_data.py")


if __name__ == '__main__':
    main()
