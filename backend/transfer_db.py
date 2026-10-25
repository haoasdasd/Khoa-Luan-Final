from sqlalchemy import create_engine, MetaData

OLD_DB = "postgresql+psycopg2://postgres.ugagakurxuhenryulwxs:HNJpe8gCIUv0CBpy@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require"
# Điền trực tiếp chuỗi kết nối của project Singapore mới vào đây:
NEW_DB = "postgresql+psycopg2://postgres.nlpardabvuvalnmsmisk:GudVsGw0JoAw2TVU@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

print("1. Đang kết nối tới 2 database...")
old_engine = create_engine(OLD_DB)
new_engine = create_engine(NEW_DB)

old_meta = MetaData()
print("2. Đang đọc cấu trúc bảng từ database cũ (Úc)...")
old_meta.reflect(bind=old_engine)

print("3. Đang tạo các bảng bên database mới (Singapore)...")
old_meta.create_all(bind=new_engine)

print("4. Đang chuyển dữ liệu theo thứ tự quan hệ...")
with old_engine.connect() as old_conn, new_engine.connect() as new_conn:
    for table in old_meta.sorted_tables:
        rows = old_conn.execute(table.select()).fetchall()
        if rows:
            print(f"   -> Đang chép {len(rows)} dòng cho bảng: {table.name}")
            data = [dict(row._mapping) for row in rows]
            new_conn.execute(table.insert(), data)
            new_conn.commit()
        else:
            print(f"   -> Bảng trống: {table.name}")

print("\nHoàn tất chuyển đổi 100% Schema và Dữ liệu!")