from sqlalchemy import Column, String, Integer, Float, Enum, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timedelta

from .base import BaseMixin
from ..core.database import Base

class ReportType(enum.Enum):
    HARASSMENT = "harassment"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    POOR_LIGHTING = "poor_lighting"
    URBAN_DESERTION = "urban_desertion"
    ACCIDENT = "accident"
    ROAD_CONDITION = "road_condition"
    OTHER = "other"

class ReportStatus(enum.Enum):
    REPORTED = "reported"
    VERIFIED = "verified"
    RESOLVED = "resolved"
    FALSE_ALARM = "false_alarm"

class SafetyReport(Base, BaseMixin):
    """Model for user-submitted safety reports"""
    
    __tablename__ = "safety_reports"
    
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    report_type = Column(Enum(ReportType), nullable=False)
    status = Column(Enum(ReportStatus), default=ReportStatus.REPORTED)
    
    # Location data (PostGIS would be better, but using lat/lng for simplicity)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(255), nullable=True)
    
    # Report details
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(Integer, default=1)  # 1-5 scale
    
    # Media
    image_url = Column(String(255), nullable=True)
    
    # Auto-expire reports after 30 minutes
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(minutes=30))
    
    # Relationships
    reporter = relationship("User", back_populates="reports")
    
    @property
    def location(self):
        """Return location as GeoJSON point"""
        return {
            "type": "Point",
            "coordinates": [self.longitude, self.latitude]
        }
    
    def is_expired(self):
        """Check if the report has expired"""
        return datetime.utcnow() > self.expires_at

# Add relationship to User model
from .user import User
User.reports = relationship("SafetyReport", back_populates="reporter", cascade="all, delete-orphan")
