
from pydantic import BaseModel, Field
from fastapi import FastAPI
from typing import Literal
import pandas as pd
import joblib
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles



columns = [
    'person_age', 'person_income', 'person_home_ownership',
    'person_emp_length', 'loan_intent', 'loan_grade', 'loan_amnt',
    'loan_int_rate', 'loan_percent_income',
    'cb_person_default_on_file', 'cb_person_cred_hist_length'
]


class LoanApplication(BaseModel):  # class of validation

    person_age: int = Field(gt=18, le=100)
    person_income: float = Field(gt=1000)
    person_home_ownership: Literal['RENT', 'OWN', 'MORTGAGE', 'OTHER']
    person_emp_length: float = Field(gt=0, le=61)
    loan_intent: Literal[
        'PERSONAL', 'EDUCATION', 'MEDICAL', 'VENTURE',
        'HOMEIMPROVEMENT', 'DEBTCONSOLIDATION'
    ]
    loan_grade: Literal['D', 'B', 'C', 'A', 'E', 'F', 'G']
    loan_amnt: int = Field(gt=1000)
    loan_int_rate: float = Field(gt=0)
    loan_percent_income: float = Field(gt=0)
    cb_person_default_on_file: Literal['Y', 'N']
    cb_person_cred_hist_length: int = Field(gt=0, le=100)


ml_model = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    ml_model['model'] = joblib.load('loan_default.pkl')
    ml_model['threshold'] = joblib.load('threshold.pkl')

    yield

    ml_model.clear()


app = FastAPI(lifespan=lifespan)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
def admin():
    return FileResponse("static/index.html")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


@app.post("/predict")
def predict(data: LoanApplication):
    input_df = pd.DataFrame([data.model_dump()], columns=columns)

    probability = float(ml_model['model'].predict_proba(input_df)[0, 1])
    threshold = float(ml_model['threshold'])
    prediction = int(probability >= threshold)

    return {
        "probability": probability,
        "default_prediction": prediction,
        "defaultthreshold": threshold,
        "result": "High Risk" if prediction == 1 else "Low Risk"
    }



