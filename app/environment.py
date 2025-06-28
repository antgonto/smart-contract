from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Redis
    REDIS_PASSWORD: str = Field(..., env="REDIS_PASSWORD")
    REDIS_PORT: int = Field(..., env="REDIS_PORT")

    # Ganache
    GANACHE_PORT: str = Field(..., env="GANACHE_PORT")
    GANACHE_NETWORK_ID: str = Field(..., env="GANACHE_NETWORK_ID")
    GANACHE_CHAIN_ID: str = Field(..., env="GANACHE_CHAIN_ID")
    GANACHE_MNEMONIC: str = Field(..., env="GANACHE_MNEMONIC")
    GANACHE_GAS_PRICE: str = Field(..., env="GANACHE_GAS_PRICE")

    # Django
    DJANGO_SECRET_KEY: str = Field(..., env="DJANGO_SECRET_KEY")
    DJANGO_SETTINGS_MODULE: str = Field(..., env="DJANGO_SETTINGS_MODULE")

    # Web3 / IPFS
    WEB3_RPC: str = Field(..., env="WEB3_RPC")
    CHAIN_ID: str = Field(..., env="CHAIN_ID")
    IPFS_API: str = Field(..., env="IPFS_API")

    # React App
    REACT_APP_API_URL: str = Field(default="", env="REACT_APP_API_URL")

    # IPFS Ports
    IPFS_5001_PORT: str = Field(..., env="IPFS_5001_PORT")
    IPFS_8080_PORT: str = Field(..., env="IPFS_8080_PORT")
    IPFS_4001_PORT: str = Field(..., env="IPFS_4001_PORT")

    class Config:
        # point at your .env file
        env_file = ".env"
        env_file_encoding = "utf-8"
        # allow uppercase-snake env names to map to lower_snake attrs
        case_sensitive = False
        extra = "ignore"


SETTINGS = Settings()
