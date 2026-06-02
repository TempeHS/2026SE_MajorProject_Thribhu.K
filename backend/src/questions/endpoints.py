from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

q_bp = Blueprint("tppr-questions", __name__)


# --- Papers ---


@q_bp.route("/api/papers", methods=["GET"])
def list_papers():
    return jsonify([])


@q_bp.route("/api/papers", methods=["POST"])
@jwt_required()
def create_paper():
    return jsonify({})


@q_bp.route("/api/papers/<int:paper_id>", methods=["GET"])
def get_paper(paper_id):
    return jsonify({})


@q_bp.route("/api/papers/<int:paper_id>", methods=["PUT"])
@jwt_required()
def update_paper(paper_id):
    return jsonify({})


@q_bp.route("/api/papers/<int:paper_id>", methods=["DELETE"])
@jwt_required()
def delete_paper(paper_id):
    return jsonify({})


@q_bp.route("/api/papers/<int:paper_id>/export", methods=["GET"])
def export_paper(paper_id):
    return jsonify({})


@q_bp.route("/api/papers/import", methods=["POST"])
@jwt_required()
def import_paper():
    return jsonify({})


# --- Questions within a paper ---


@q_bp.route("/api/papers/<int:paper_id>/questions", methods=["GET"])
def list_paper_questions(paper_id):
    return jsonify([])


@q_bp.route("/api/papers/<int:paper_id>/questions", methods=["POST"])
@jwt_required()
def add_question_to_paper(paper_id):
    return jsonify({})


@q_bp.route("/api/papers/<int:paper_id>/questions/import", methods=["POST"])
@jwt_required()
def import_questions_to_paper(paper_id):
    return jsonify({})


@q_bp.route("/api/papers/<int:paper_id>/questions/reorder", methods=["PUT"])
@jwt_required()
def reorder_paper_questions(paper_id):
    return jsonify({})


@q_bp.route("/api/papers/<int:paper_id>/questions/<int:question_id>", methods=["GET"])
def get_paper_question(paper_id, question_id):
    return jsonify({})


@q_bp.route("/api/papers/<int:paper_id>/questions/<int:question_id>", methods=["PUT"])
@jwt_required()
def update_paper_question(paper_id, question_id):
    return jsonify({})


@q_bp.route(
    "/api/papers/<int:paper_id>/questions/<int:question_id>", methods=["DELETE"]
)
@jwt_required()
def delete_paper_question(paper_id, question_id):
    return jsonify({})


# --- Global question search ---


@q_bp.route("/api/questions", methods=["GET"])
def search_questions():
    return jsonify([])


@q_bp.route("/api/questions/<int:question_id>", methods=["GET"])
def get_question(question_id):
    return jsonify({})
