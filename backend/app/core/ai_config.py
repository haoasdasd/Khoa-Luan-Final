import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import requests
import os
import re
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

# Nới lỏng bảo mật hết cỡ để AI thoải mái sáng tạo, không bị "nhát"
safety_settings = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

# SỬA LỖI 404: Dùng định danh model chuẩn nhất của năm 2026
gemini_model = genai.GenerativeModel('gemini-3-flash-preview') 

def get_ai_content_and_keyword(prompt: str):
    """
    Hệ thống phân tích tâm lý người dùng: 
    Biến những câu lệnh khô khan thành những status 'nghệ' và 'dính'.
    """
    try:
        # Tiền lọc bỏ các ký tự rác
        user_intent = re.sub(r'@AI|AI|Bot|đăng bài|viết bài|hãy', '', prompt, flags=re.IGNORECASE).strip()
        
        system_instruction = (
            "Bạn là một Content Creator Gen Z chuyên nghiệp trên mạng xã hội Việt Nam. "
            "NHIỆM VỤ: Biến chủ đề được cung cấp thành một status cực kỳ thu hút, sáng tạo và tự nhiên. "
            "YÊU CẦU CHI TIẾT: \n"
            "1. Nếu là chủ đề tình cảm: Viết kiểu thả thính, sâu sắc hoặc hài hước (tùy ngữ cảnh). \n"
            "2. Nếu là chủ đề đời thường: Viết kiểu chill, tích cực, pha chút từ lóng trendy.\n"
            "3. Tuyệt đối KHÔNG nhắc lại lệnh của người dùng. KHÔNG có chữ 'AI' hay 'Vibe hôm nay'.\n"
            "4. Định dạng bắt buộc: [STATUS] nội dung status [KEYWORD] 2 từ khóa tiếng Anh miêu tả không gian ảnh.\n"
            f"CHỦ ĐỀ TỪ NGƯỜI DÙNG: {user_intent}"
        )

        response = gemini_model.generate_content(system_instruction, safety_settings=safety_settings)
        raw_text = response.text.strip()

        # Tách lấy phần nội dung
        status_match = re.search(r'\[STATUS\](.*?)\[KEYWORD\]', raw_text, re.S)
        keyword_match = re.search(r'\[KEYWORD\](.*)', raw_text, re.S)

        final_status = status_match.group(1).strip() if status_match else raw_text
        final_keyword = keyword_match.group(1).strip() if keyword_match else user_intent

        # Clean cuối cùng: xóa ngoặc kép, dấu sao
        final_status = re.sub(r'[*"\']', '', final_status)
        
        return final_status, final_keyword

    except Exception as e:
        print(f"❌ Lỗi Gemini: {e}")
        # Fallback đẳng cấp hơn, không dùng mẫu cũ
        return f"Gói gọn cả tâm tình này vào một chút bình yên... ✨", "minimal aesthetic"

def get_ai_image(english_keyword: str):
    access_key = os.getenv('UNSPLASH_ACCESS_KEY')
    # Danh sách ảnh dự phòng chất lượng cao nếu tìm kiếm thất bại
    default_imgs = [
        "https://images.unsplash.com/photo-1517694712202-14dd9538aa97",
        "https://images.unsplash.com/photo-1499750310107-5fef28a66643",
        "https://images.unsplash.com/photo-1516259762381-22954d7d3ad2"
    ]
    
    if not access_key: return default_imgs[0]

    try:
        # MẸO: Thêm 'vibe' vào keyword để ảnh có chiều sâu hơn
        # Ví dụ: thay vì chỉ 'cat', nó sẽ tìm 'cat aesthetic home chill'
        refined_query = f"{english_keyword} aesthetic chill"
        
        url = "https://api.unsplash.com/search/photos"
        params = {
            "query": refined_query,
            "per_page": 10, # Lấy 10 ảnh rồi chọn ngẫu nhiên 1 cái cho lạ
            "orientation": "landscape", # Ưu tiên ảnh ngang cho đẹp giao diện
            "client_id": access_key
        }
        
        res = requests.get(url, params=params, timeout=10)
        data = res.json()
        
        if data.get('results'):
            import random
            # Chọn ngẫu nhiên 1 trong các kết quả trả về để không bị trùng ảnh cũ
            random_photo = random.choice(data['results'])
            return random_photo['urls']['regular']
            
    except Exception as e:
        print(f"❌ Lỗi Unsplash: {e}")
        
    return default_imgs[1]