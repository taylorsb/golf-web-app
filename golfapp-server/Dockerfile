FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt

# Copy the combined CA certificates
RUN mkdir -p /app/certs/
COPY combined-ca-certificates.pem /app/certs/combined-ca-certificates.pem

COPY . .

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]