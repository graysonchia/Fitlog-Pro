from datetime import date

from pydantic import BaseModel, EmailStr


class UserUpdate(BaseModel):
    name: str | None = None
    email: EmailStr | None = None
    gender: str | None = None
    date_of_birth: date | None = None
    height_cm: float | None = None
    fitness_level: str | None = None
