from django.db import models
from apps.restaurants.models import Restaurant

class RealtimeEvent(models.Model):
    id = models.BigAutoField(primary_key=True)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name="realtime_events")
    event_type = models.CharField(max_length=64, db_index=True)
    entity_type = models.CharField(max_length=32, db_index=True)
    entity_id = models.CharField(max_length=64, db_index=True)
    payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "realtime_events"
        ordering = ["id"]
        indexes = [
            models.Index(fields=["restaurant", "id"]),
            models.Index(fields=["restaurant", "entity_type", "entity_id"]),
            models.Index(fields=["restaurant", "created_at"]),
        ]

    def __str__(self):
        return f"{self.event_type} ({self.entity_type}:{self.entity_id}) at {self.created_at}"
