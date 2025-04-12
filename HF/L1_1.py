from huggingface_hub import HfApi

api = HfApi()
models = list(api.list_models(limit=3))
print(models)

