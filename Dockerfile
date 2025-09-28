FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Kolkata

WORKDIR /app

# Step 1: Update package list
RUN apt-get update -o Acquire::Retries=10 -o Acquire::ForceIPv4=true

# Step 2: Install dependencies
RUN apt-get install -y --no-install-recommends \
      -o Acquire::Retries=10 -o Acquire::ForceIPv4=true \
      tzdata \
      pandoc \
      texlive-latex-recommended \
      texlive-fonts-recommended \
      texlive-fonts-extra \
      python3 \
      python3-pip

# Step 3: Configure timezone
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone && \
    dpkg-reconfigure -f noninteractive tzdata

# Step 4: Update TeX Live package database and verify lmodern.sty
RUN texhash && \
    kpsewhich lmodern.sty || { echo "Error: lmodern.sty not found"; exit 1; }

# Step 5: Clean up
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]