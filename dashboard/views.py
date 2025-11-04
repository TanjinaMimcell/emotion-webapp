from django.shortcuts import render 
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import EmotionLog
from deepface import DeepFace
import cv2
import numpy as np
import base64

def index(request):
    return render(request, 'dashboard/index.html')

class AnalyzeEmotion(APIView):
    def post(self, request, *args, **kwargs):
        data = request.data
        face_id = int(data.get('face_id', 1))
        actual_emotion = data.get('actual', 'neutral')
        frame_b64 = data.get('frame')

        # Convert base64 to OpenCV image
        img_bytes = base64.b64decode(frame_b64.split(',')[1])
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        try:
            # Detect faces with OpenCV
            face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5)

            results = []

            for i, (x, y, w, h) in enumerate(faces):
                face_img = img[y:y+h, x:x+w]
                try:
                    analysis = DeepFace.analyze(face_img, actions=['emotion'], enforce_detection=False)
                    predicted_emotion = analysis[0]['dominant_emotion']
                except:
                    predicted_emotion = 'neutral'

                correct = int(actual_emotion == predicted_emotion)
                accuracy = 100 if correct else 0

                # Save to DB
                EmotionLog.objects.create(
                    face_id=i+1,
                    actual=actual_emotion,
                    predicted=predicted_emotion,
                    correct=correct,
                    accuracy=accuracy
                )

                results.append({
                    "face_id": i+1,
                    "predicted": predicted_emotion,
                    "correct": correct,
                    "coords": [int(x), int(y), int(w), int(h)]
                })

            if not results:
                # No face detected
                results.append({"face_id": 1, "predicted": "neutral", "correct": 0, "coords": [50,50,200,200]})

        except Exception as e:
            # In case of any error
            results = [{"face_id": 1, "predicted": "neutral", "correct": 0, "coords": [50,50,200,200]}]

        return Response({"faces": results})
