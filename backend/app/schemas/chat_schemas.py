# app/schemas/chat.py
from pydantic import BaseModel, Field
from typing import List
from uuid import UUID

class AddMembersRequest(BaseModel):
    member_ids: List[UUID] 