from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.schemas.common import ORMBase


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    gender: str | None = None
    date_of_birth: date | None = None
    height_cm: float | None = None
    fitness_level: str | None = None


class UserRead(ORMBase):
    id: UUID
    name: str
    email: EmailStr
    gender: str | None
    date_of_birth: date | None
    height_cm: float | None
    fitness_level: str | None
    created_at: datetime
