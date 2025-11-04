from rest_framework import serializers
from .models import EmotionLog

class EmotionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmotionLog
        fields = '__all__'
