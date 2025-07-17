from flask import Flask, render_template, request, send_file, session, redirect, url_for
from scripts.insurance_calculator import compute_break_even, generate_plot
from urllib.parse import urlparse
import os
from dotenv import load_dotenv

# Load environment variables from the .env file (if present)
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY")  # Required for session management

SUPPORTED_LANGUAGES = ["en", "de", "fr", "it"]


def get_user_language():
    if "language" in session:
        return session["language"]
    best_match = request.accept_languages.best_match(SUPPORTED_LANGUAGES)
    return best_match or "en"


@app.route("/")
def root():
    lang = get_user_language()
    return redirect(url_for("index", lang=lang))


@app.route("/<lang>/")
def index(lang):
    if lang not in SUPPORTED_LANGUAGES:
        correct_lang = get_user_language()
        return redirect(url_for("index", lang=correct_lang))
    return render_template(f"{lang}/index.html", lang=lang, page_is_results=False)


@app.route("/<lang>/choose")
def choose(lang):
    if lang not in SUPPORTED_LANGUAGES:
        correct_lang = get_user_language()
        return redirect(url_for("choose", lang=correct_lang))
    return render_template(
        f"{lang}/insurance-chooser.html", lang=lang, page_is_results=False
    )


@app.route("/<lang>/calculate", methods=["POST"])
def calculate(lang):
    if lang not in SUPPORTED_LANGUAGES:
        correct_lang = get_user_language()
        return redirect(url_for("index", lang=correct_lang))
    try:
        premiums = [float(p) for p in request.form.getlist("premium[]")]
        if len(premiums) != 6:
            return "Error: Please provide exactly six premiums.", 400
        results = compute_break_even(premiums)
        premiums_str = ",".join(map(str, premiums))
        return render_template(
            f"{lang}/results.html",
            results=results,
            premiums_str=premiums_str,
            lang=lang,
            page_is_results=True,
        )
    except ValueError:
        return "Error: All inputs must be valid numbers.", 400


@app.route("/plot")
def plot():
    try:
        premiums_str = request.args.get("premiums")
        premiums = [float(p) for p in premiums_str.split(",")]
        lang = request.args.get(
            "lang", get_user_language()
        )  # Get lang from query or session
        buf = generate_plot(premiums, lang=lang)
        return send_file(buf, mimetype="image/png")
    except ValueError:
        return "Error: Invalid premium data for plot.", 400


@app.route("/set_language/<lang>")
def set_language(lang):
    print(f"Referrer: {request.referrer}")  # Add this for debugging
    if lang in SUPPORTED_LANGUAGES:
        session["language"] = lang
        referrer = request.referrer
        if referrer:
            parsed = urlparse(referrer)
            path_parts = parsed.path.strip("/").split("/")
            print(f"Parsed referrer path parts: {path_parts}")  # Debugging
            if len(path_parts) >= 2 and path_parts[0] in SUPPORTED_LANGUAGES:
                original_endpoint = path_parts[1:] if len(path_parts) > 1 else ""
                original_endpoint = "/".join(original_endpoint)
                print(f"Original endpoint: {original_endpoint}")  # Debugging

                return redirect(url_for(original_endpoint or "index", lang=lang))
    # Fallback to index if referrer is missing or invalid
    return redirect(url_for("index", lang=lang))


if __name__ == "__main__":
    app.run(debug=True)
