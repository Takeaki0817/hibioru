#!/bin/bash
# Supabaseデータベースのバックアップスクリプト
# スキーマとデータの両方をバックアップ

set -e

BACKUP_DIR="supabase/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "📦 Supabaseデータベースのバックアップを開始..."

# スキーマのバックアップ
echo "  → スキーマをバックアップ中..."
supabase db dump -f "${BACKUP_DIR}/schema/schema_${TIMESTAMP}.sql"

# データのバックアップ
echo "  → データをバックアップ中..."
supabase db dump --data-only -f "${BACKUP_DIR}/data/data_${TIMESTAMP}.sql"

echo "✅ バックアップ完了:"
echo "   - ${BACKUP_DIR}/schema/schema_${TIMESTAMP}.sql"
echo "   - ${BACKUP_DIR}/data/data_${TIMESTAMP}.sql"
