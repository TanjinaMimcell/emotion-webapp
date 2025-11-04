from django.db import models

class EmotionLog(models.Model):
    face_id = models.IntegerField()
    actual = models.CharField(max_length=20)
    predicted = models.CharField(max_length=20)
    correct = models.BooleanField()
    accuracy = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Face {self.face_id}: {self.predicted}"
