from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    REDIS_PASSWORD: str = Field(validation_alias="REDIS_PASSWORD")
    REDIS_PORT: int = Field(validation_alias="REDIS_PORT")
    REDIS_PASSWORD: str = Field(validation_alias="REDIS_PASSWORD")
    REDIS_PORT: int = Field(validation_alias="REDIS_PORT")

    GANACHE_PORT: str = Field(validation_alias="GANACHE_PORT")
    GANACHE_NETWORK_ID: str = Field(validation_alias="GANACHE_NETWORK_ID")
    GANACHE_CHAIN_ID: str = Field(validation_alias="GANACHE_CHAIN_ID")
    GANACHE_MNEMONIC: str = Field(validation_alias="GANACHE_MNEMONIC")
    GANACHE_GAS_PRICE: str = Field(validation_alias="GANACHE_GAS_PRICE")
    DJANGO_SECRET_KEY: str = Field(validation_alias="DJANGO_SECRET_KEY")
    DJANGO_SETTINGS_MODULE: str = Field(validation_alias="DJANGO_SETTINGS_MODULE")
    WEB3_RPC: str = Field(validation_alias="WEB3_RPC")
    CHAIN_ID: str = Field(validation_alias="CHAIN_ID")
    IPFS_API: str = Field(validation_alias="IPFS_API")

    class Config:
        env_file = ".env"
        extra = "allow"


SETTINGS = Settings()
