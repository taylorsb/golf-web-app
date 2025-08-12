FROM python:3.11-slim

WORKDIR /app

COPY golfapp-server/requirements.txt requirements.txt
RUN pip install -r requirements.txt

COPY golfapp-server/. .

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]