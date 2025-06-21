# app/api/common/schemas.py
from ninja import Schema
from pydantic import Field


class ErrorSchema(Schema):
    message: str = Field(..., description="Error message")


class SuccessSchema(Schema):
    message: str = Field(..., description="Success message")


