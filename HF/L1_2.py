from transformers import pipeline

my_pipeline = pipeline(
    "text-classification",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

print(my_pipeline("DataCamp is awesome!"))

#

my_pipeline = pipeline("text-generation", model="gpt2")
results = my_pipeline("What if AI", max_length=10, num_return_sequences=2)

for result in results:
    print(result['generated_text'])


from transformers import pipeline
print(pipeline('sentiment-analysis')("Hello world!"))

#

my_pipeline = pipeline(
    "text-classification",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)
my_pipeline.save_pretrained("/path/to/saved_model_directory")

reloaded_pipeline = pipeline(
    "text-classification",
    model="/path/to/saved_model_directory"
)
print(reloaded_pipeline("Hugging Face is great!"))