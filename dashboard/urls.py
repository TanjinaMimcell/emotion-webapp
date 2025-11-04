from django.urls import path
from .views import index, AnalyzeEmotion


urlpatterns = [
    path('', index, name='home'),           # homepage
    path('api/analyze/', AnalyzeEmotion.as_view(), name='analyze-emotion'),
]

