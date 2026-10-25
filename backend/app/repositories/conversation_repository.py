"""
repositories/conversation_repository.py
Data access layer cho Conversation và ConversationMember
"""
from typing import Optional, List
from uuid import UUID
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from app.models.conversation import Conversation, ConversationMember


class ConversationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, conversation_id: UUID):
        return (
            self.db.query(Conversation)
            .options(
                joinedload(Conversation.members).joinedload(ConversationMember.user)
            )
            .filter(Conversation.id == conversation_id)
            .first()
        )

    def create(self, created_by: UUID, type: str, name: Optional[str] = None) -> Conversation:
        """Tạo conversation mới"""
        conv = Conversation(name=name, type=type, created_by=created_by)
        self.db.add(conv)
        self.db.flush()
        return conv

    def get_user_conversations(self, user_id: UUID, accepted_only: bool = True):
        query = (
            self.db.query(Conversation)
            .join(ConversationMember)
            .options(
                # Eager load thông tin thành viên để lấy tên/avatar ở Sidebar
                joinedload(Conversation.members).joinedload(ConversationMember.user)
            )
            .filter(ConversationMember.user_id == user_id)
        )
        
        if accepted_only:
            query = query.filter(ConversationMember.is_accepted == True)
        
        return query.order_by(Conversation.updated_at.desc()).all()

    def add_member(self, conversation_id: UUID, user_id: UUID, is_accepted: bool, role: str = "member") -> ConversationMember:
        """Thêm thành viên vào conversation"""
        member = ConversationMember(
            conversation_id=conversation_id,
            user_id=user_id,
            role=role,
            is_accepted=is_accepted
        )
        self.db.add(member)
        self.db.commit()
        return member

    def remove_member(self, conversation_id: UUID, user_id: UUID) -> bool:
        """Xóa thành viên khỏi conversation"""
        deleted = self.db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id
        ).delete()
        self.db.commit()
        return deleted > 0

    def is_member(self, conversation_id: UUID, user_id: UUID) -> bool:
        """Kiểm tra user có phải thành viên không"""
        return self.db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id
        ).first() is not None

    def get_member(self, conversation_id: UUID, user_id: UUID) -> Optional[ConversationMember]:
        return self.db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id
        ).first()

    def commit(self):
        self.db.commit()

    def find_private_conversation(self, user_id_1: UUID, user_id_2: UUID) -> Optional[Conversation]:
        """
        Tìm cuộc hội thoại 1-1 đã tồn tại giữa 2 người dùng.
        Logic: Tìm conversation type 'private' mà cả 2 người đều là thành viên.
        """
        from sqlalchemy import func
        
        return (
            self.db.query(Conversation)
            .join(ConversationMember)
            .filter(Conversation.type == "private")
            .filter(ConversationMember.user_id.in_([user_id_1, user_id_2]))
            .group_by(Conversation.id)
            # Phải có đúng 2 thành viên là 2 ID này
            .having(func.count(ConversationMember.user_id) == 2)
            .first()
        )
    
    def get_member_ids(self, conversation_id: UUID) -> List[UUID]:
        """Lấy danh sách ID của tất cả thành viên trong hội thoại"""
        members = self.db.query(ConversationMember.user_id).filter(
            ConversationMember.conversation_id == conversation_id
        ).all()
        
        # Kết quả trả về là list các tuple [(id1,), (id2,)], cần flatten nó ra
        return [m.user_id for m in members]
    
    def get_memberships(self, conversation_id: UUID):
        """Lấy danh sách tất cả membership của một conversation"""
        return self.db.query(ConversationMember).filter(
            ConversationMember.conversation_id == conversation_id
        ).all()
    
    def get_user_conversations_by_status(self, user_id: UUID, accepted: bool = True):
        """
        Lấy danh sách hội thoại của user dựa trên trạng thái accepted
        """
        from app.models.conversation import Conversation, ConversationMember
        
        return (
            self.db.query(Conversation)
            .join(ConversationMember)
            .filter(
                ConversationMember.user_id == user_id,
                ConversationMember.is_accepted == accepted
            )
            .order_by(Conversation.updated_at.desc())
            .all()
        )
    
    def create_group_with_members(
    self, 
    creator_id: UUID, 
    name: str, 
    member_ids: List[UUID]
    ) -> Conversation:
        """Tạo nhóm và thêm danh sách thành viên trong 1 transaction"""
        # 1. Tạo nhóm
        conv = Conversation(name=name, type="group", created_by=creator_id)
        self.db.add(conv)
        self.db.flush() # Để lấy conv.id

        # 2. Tạo danh sách member (Bao gồm cả creator là Admin)
        all_members = []
        
        # Đảm bảo creator luôn có trong danh sách và là admin
        if creator_id not in member_ids:
            member_ids.append(creator_id)

        for uid in member_ids:
            all_members.append(ConversationMember(
                conversation_id=conv.id,
                user_id=uid,
                role="admin" if uid == creator_id else "member",
                is_accepted=True # Thường admin add vào group thì cho true luôn
            ))

        self.db.add_all(all_members)
        self.db.commit()
        self.db.refresh(conv)
        return conv
    

    def accept_invitation(self, conversation_id: UUID, user_id: UUID) -> bool:
        """User chấp nhận tham gia hội thoại/nhóm"""
        member = self.get_member(conversation_id, user_id)
        if member:
            member.is_accepted = True
            self.db.commit()
            return True
        return False
    
    def get_private_conversation(self, user_id: UUID, friend_id: UUID):
        """
        Tìm cuộc hội thoại 1-1 (private) đã tồn tại giữa 2 người dùng.
        """
        return self.db.query(Conversation).join(
            ConversationMember, Conversation.id == ConversationMember.conversation_id
        ).filter(
            Conversation.type == "private",
            ConversationMember.user_id.in_([user_id, friend_id])
        ).group_by(Conversation.id).having(
            func.count(ConversationMember.user_id) == 2
        ).first()
    
    def delete(self, conv_id: UUID):
        conv = self.db.query(Conversation).filter(Conversation.id == conv_id).first()
        if conv:
            self.db.delete(conv)
            return True
        return False
