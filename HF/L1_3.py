from datasets import load_dataset
from datasets import load_dataset_builder

# Load dataset metadata
data_builder = load_dataset_builder("imdb")
# Access dataset size
dataset_size_mb = data_builder.info.dataset_size / (1024 ** 2)
print(f"Dataset size: {round(dataset_size_mb, 2)} MB")

#

data = load_dataset("imdb")
data = load_dataset("imdb", split="train")

#

# Import the function to load dataset metadata
from datasets import load_dataset_builder

# Initialize the dataset builder for the MMLU-Pro dataset
reviews_builder = load_dataset_builder("TIGER-Lab/MMLU-Pro")

# Display dataset metadata
print(reviews_builder.info)

# Calculate and print the dataset size in MB
dataset_size_mb = reviews_builder.info.dataset_size / (1024 ** 2)
print(f"Dataset size: {round(dataset_size_mb, 2)} MB")

#

# Filter the documents
filtered = wikipedia.filter(lambda row: "football" in row["text"])

# Create a sample dataset
example = filtered.select(range(1))

print(example[0]["text"])