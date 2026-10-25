from sqlalchemy.orm import Session
from uuid import UUID
from app.core.ai_config import get_ai_content_and_keyword, get_ai_image 
from app.repositories.post_repository import PostRepository

class AIService:
    def __init__(self, db: Session):
        self.db = db
        self.post_repo = PostRepository(db)

    async def handle_ai_request(self, user_id: UUID, user_prompt: str):
        # 1. Gọi hàm mới trả về 2 giá trị
        content, eng_keyword = get_ai_content_and_keyword(user_prompt)
        
        # 2. Tìm ảnh bằng tiếng Anh (mượt hơn nhiều)
        image_url = get_ai_image(eng_keyword)
        
        # 3. Tạo post và lưu vào Database
        return self.post_repo.create(
            user_id=user_id,
            content=content,
            media_url=image_url,
            visibility="public"
        )