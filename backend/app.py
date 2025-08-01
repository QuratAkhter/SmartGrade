from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer, util
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk import download
import spacy
import string
import re
import joblib
import numpy as np
from flask_cors import CORS

app = Flask(__name__)
CORS(app) 
# Load once
semantic_model = SentenceTransformer('all-MiniLM-L6-v2')
nlp = spacy.load("en_core_web_sm")
model = joblib.load('best_model.pkl')

download('stopwords')
download('wordnet')

stop_words = set(stopwords.words('english'))
lemmatizer = WordNetLemmatizer()

# ------------------ Utility Functions ------------------

def clean_text(text):
    text = re.sub(r'<.*?>', '', text)
    text = re.sub(r'[^A-Za-z0-9\s.,?!\'"]', '', text)
    return text

def normalize_data_science_terms(text):
    replacements = {
        "ml": "machine learning",
        "ai": "artificial intelligence",
        "dl": "deep learning",
        "nlp": "natural language processing",
        "cv": "computer vision",
        "eda": "exploratory data analysis",
        "svm": "support vector machine",
        "cnn": "convolutional neural network",
        "rnn": "recurrent neural network",
        "ann": "artificial neural network",
        "lstm": "long short term memory",
        "xgboost": "extreme gradient boosting",
        "gbm": "gradient boosting machine",
        "knn": "k nearest neighbors",
        "lr": "logistic regression",
        "regression model": "regression",
        "classification model": "classification",
        "scikit-learn": "sklearn",
        "sci-kit learn": "sklearn",
        "tf": "tensorflow",
        "pytorch": "torch",
        "feature engineering": "feature extraction",
        "data wrangling": "data cleaning",
        "data visualization": "data viz",
        "viz": "visualization",
        "cs":"computer science",
        "it": "information technology"
    }
    text = text.lower()
    for key, val in replacements.items():
        text = text.replace(key, val)
    return text

def remove_punctuation(text):
    return text.translate(str.maketrans('', '', string.punctuation))

def jaccard_similarity(a, b):
    return len(set(a) & set(b)) / len(set(a) | set(b)) if set(a) | set(b) else 0

# ------------------ Scoring Functions ------------------

def calculate_semantic_score(answer, response):
    answer_embed = semantic_model.encode([answer], convert_to_tensor=True)
    response_embed = semantic_model.encode([response], convert_to_tensor=True)
    score = util.cos_sim(answer_embed, response_embed)[0][0].item()
    return round(score, 3)

def calculate_keyword_score(answer, response):
    ans_clean = remove_punctuation(answer)
    res_clean = remove_punctuation(response)
    ans_tokens = [lemmatizer.lemmatize(w) for w in ans_clean.split() if w not in stop_words]
    res_tokens = [lemmatizer.lemmatize(w) for w in res_clean.split() if w not in stop_words]
    return round(jaccard_similarity(ans_tokens, res_tokens), 3)

def calculate_grammar_quality_score(text):
    if not isinstance(text, str) or text.strip() == "":
        return 0.0
    doc = nlp(text)
    issues = 0
    word_count = len(text.split())

    issues += sum(1 for token in doc if token.dep_ == "auxpass")
    if not any(tok.dep_ == "nsubj" for tok in doc):
        issues += 1
    if not any(tok.pos_ == "VERB" for tok in doc):
        issues += 1
    if not text.strip().endswith(('.', '?', '!')):
        issues += 1

    max_acceptable_issues = max(1, word_count // 20)
    penalty_ratio = min(1.0, issues / (max_acceptable_issues + 1e-5))
    score = 1.0 - penalty_ratio
    return round(max(0.2, min(1.0, score)), 3)

# ------------------ API Route ------------------

@app.route('/evaluate', methods=['POST'])
def evaluate():
    data = request.json
    answer = data.get("answer", "").strip().lower()
    responses = data.get("responses")  # Can be a list or a single string under "response"

    answer = clean_text(answer)
    answer = normalize_data_science_terms(answer)

    def evaluate_single_response(resp):
        response = clean_text(resp.strip().lower())
        response = normalize_data_science_terms(response)

        semantic_score = calculate_semantic_score(answer, response)
        keyword_score = calculate_keyword_score(answer, response)
        grammar_score = calculate_grammar_quality_score(response)
        input_vector = np.array([[semantic_score, keyword_score, grammar_score]])
        predicted_score = model.predict(input_vector)[0]

        return {
            "response": resp,
            "semantic_score": semantic_score,
            "keyword_score": keyword_score,
            "grammar_score": grammar_score,
            "predicted_score": round(predicted_score, 2)
        }

    if isinstance(responses, list):
        results = [evaluate_single_response(resp) for resp in responses]
        return jsonify({"results": results})
    else:
        response = data.get("response", "").strip().lower()
        return jsonify(evaluate_single_response(response))
        

