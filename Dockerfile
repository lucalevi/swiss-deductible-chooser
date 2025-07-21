# Use an official Python runtime as the base image
FROM python:3.13.1-slim

# Set working directory
WORKDIR /app

# Install system dependencies for Matplotlib
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 5000

# Run the application with environment variable support
CMD ["sh", "-c", "python swiss-insurances/app.py"]