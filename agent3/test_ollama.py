from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"
)

response = client.chat.completions.create(
    model="gpt-oss:120b",
    messages=[
        {
            "role": "system",
            "content": "Kamu adalah analis industri yang ahli dalam root cause analysis."
        },
        {
            "role": "user",
            "content": "Jelaskan secara singkat apa itu root cause analysis dalam konteks manufaktur."
        }
    ]
)

print(response.choices[0].message.content)