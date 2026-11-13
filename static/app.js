
const form = document.getElementById("loanForm");
const predictButton = document.getElementById("predictButton");
const errorMessage = document.getElementById("errorMessage");

// Calculate loan-to-income ratio automatically
function calculateRatio() {
    const income = Number(document.getElementById("person_income").value);
    const loanAmount = Number(document.getElementById("loan_amnt").value);

    const ratioField = document.getElementById("loan_percent_income");

    if (income > 0 && loanAmount > 0) {
        ratioField.value = (loanAmount / income).toFixed(4);
    } else {
        ratioField.value = "";
    }
}

// Recalculate whenever income or loan amount changes
document.getElementById("person_income")
    .addEventListener("input", calculateRatio);

document.getElementById("loan_amnt")
    .addEventListener("input", calculateRatio);

// Calculate ratio when the page first loads
calculateRatio();

// Listen for form submission
form.addEventListener("submit", async function (event) {
    event.preventDefault();

    errorMessage.hidden = true;
    errorMessage.textContent = "";

    calculateRatio();

    // Collect all 11 input values
    const payload = {
        person_age: Number(document.getElementById("person_age").value),

        person_income: Number(document.getElementById("person_income").value),

        person_home_ownership:
            document.getElementById("person_home_ownership").value,

        person_emp_length:
            Number(document.getElementById("person_emp_length").value),

        loan_intent:
            document.getElementById("loan_intent").value,

        loan_grade:
            document.getElementById("loan_grade").value,

        loan_amnt:
            Number(document.getElementById("loan_amnt").value),

        loan_int_rate:
            Number(document.getElementById("loan_int_rate").value),

        loan_percent_income:
            Number(document.getElementById("loan_percent_income").value),

        cb_person_default_on_file:
            document.getElementById("cb_person_default_on_file").value,

        cb_person_cred_hist_length:
            Number(document.getElementById("cb_person_cred_hist_length").value)
    };

    predictButton.disabled = true;
    predictButton.textContent = "Analyzing loan risk...";

    try {
        // Send data to FastAPI
        const response = await fetch("/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);

            if (response.status === 422) {
                throw new Error(
                    "Invalid application details. Please check your inputs."
                );
            }

            throw new Error(
                errorData?.detail && typeof errorData.detail === "string"
                    ? errorData.detail
                    : "Prediction failed. Please try again."
            );
        }

        const data = await response.json();

        // Read response from FastAPI
        const probability = Number(data.probability);
        const threshold = Number(data.defaultthreshold);
        const prediction = Number(data.default_prediction);

        if (
            !Number.isFinite(probability) ||
            !Number.isFinite(threshold) ||
            ![0, 1].includes(prediction)
        ) {
            throw new Error("Invalid prediction response from server.");
        }

        // Get result elements
        const resultCard = document.getElementById("resultCard");
        const resultIcon = document.getElementById("resultIcon");
        const decisionText = document.getElementById("decisionText");
        const probabilityValue = document.getElementById("probabilityValue");
        const thresholdValue = document.getElementById("thresholdValue");
        const predictedClass = document.getElementById("predictedClass");
        const finalNote = document.getElementById("finalNote");
        const probabilityFill = document.getElementById("probabilityFill");
        const thresholdMarker = document.getElementById("thresholdMarker");

        // Display probability and threshold
        probabilityValue.textContent = `${(probability * 100).toFixed(2)}%`;
        thresholdValue.textContent = `${(threshold * 100).toFixed(2)}%`;
        predictedClass.textContent = prediction;

        // Update probability bar
        probabilityFill.style.width = `${Math.max(0, Math.min(100, probability * 100))}%`;

        // Update threshold marker
        thresholdMarker.style.left = `${Math.max(0, Math.min(100, threshold * 100))}%`;

        // Remove previous prediction styling
        resultCard.classList.remove("low-risk", "high-risk");

        if (prediction === 1) {
            // HIGH RISK - RED
            resultCard.classList.add("high-risk");

            resultIcon.textContent = "✖";
            decisionText.textContent = "High Risk — Review Required";

            finalNote.textContent =
                "This application exceeds the model's decision threshold. " +
                "The applicant has been flagged as higher risk of loan default. " +
                "Further review is recommended.";

        } else {
            // LOW RISK - GREEN
            resultCard.classList.add("low-risk");

            resultIcon.textContent = "✔";
            decisionText.textContent = "Low Risk — Eligible for Review";

            finalNote.textContent =
                "This application is below the model's decision threshold. " +
                "The applicant has been classified as lower risk of loan default. " +
                "This is not an automatic loan approval.";
        }

    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.hidden = false;

        console.error("Prediction error:", error);

    } finally {
        predictButton.disabled = false;
        predictButton.textContent = "Analyze Loan Risk";
    }
});
