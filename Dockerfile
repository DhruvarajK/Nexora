FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Asia/Kolkata

WORKDIR /app

# Step 1: Update and install dependencies (including lmodern)
RUN apt-get update -o Acquire::Retries=10 -o Acquire::ForceIPv4=true && \
    apt-get install -y --no-install-recommends \
      -o Acquire::Retries=10 -o Acquire::ForceIPv4=true \
      tzdata \
      pandoc \
      texlive-latex-recommended \
      texlive-fonts-recommended \
      texlive-fonts-extra \
      lmodern \
      python3 \
      python3-pip && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Step 2: Configure timezone
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone && \
    dpkg-reconfigure -f noninteractive tzdata

# Step 3: Update TeX Live database and verify lmodern.sty
RUN texhash && \
    kpsewhich lmodern.sty || { echo "Error: lmodern.sty not found after installation"; exit 1; }

COPY requirements.txt .

RUN pip3 install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]