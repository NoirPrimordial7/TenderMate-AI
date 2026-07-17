import hashlib
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.api.dependencies.auth import get_current_user
from app.api.dependencies.rate_limit import TENDER_QUESTION_RATE_LIMIT, check_rate_limit_for_user_or_ip, get_client_ip, get_user_agent
from app.core.config import Settings, get_settings
from app.schemas.auth import UserResponse
from app.schemas.questions import TenderQuestionHistoryResponse, TenderQuestionRequest, TenderQuestionResponse
from app.services.audit_service import record_audit_log
from app.services.rate_limit_service import RateLimitService, get_rate_limit_service
from app.services.tender_question_service import TenderQuestionError, TenderQuestionService, get_tender_question_service

router = APIRouter(prefix="/tenders", tags=["tender questions"])


@router.post("/{id}/questions", response_model=TenderQuestionResponse)
def ask_tender_question(id: UUID, payload: TenderQuestionRequest, request: Request, current_user: UserResponse = Depends(get_current_user), service: TenderQuestionService = Depends(get_tender_question_service), settings: Settings = Depends(get_settings), limiter: RateLimitService = Depends(get_rate_limit_service)) -> TenderQuestionResponse:
    check_rate_limit_for_user_or_ip(request=request, current_user=current_user, rule=TENDER_QUESTION_RATE_LIMIT, settings=settings, limiter=limiter)
    question_hash = hashlib.sha256(payload.question.encode("utf-8")).hexdigest()[:16]
    try:
        result = service.ask(id, current_user.id, payload.question, payload.language, payload.conversation_id)
    except TenderQuestionError as exc:
        record_audit_log(action="tender_question_failed", user_id=current_user.id, resource_type="tender", resource_id=id, ip_address=get_client_ip(request), user_agent=get_user_agent(request), metadata={"question_hash": question_hash, "question_length": len(payload.question), "failure_category": exc.category})
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    record_audit_log(action="tender_question_answered", user_id=current_user.id, resource_type="tender", resource_id=id, ip_address=get_client_ip(request), user_agent=get_user_agent(request), metadata={"question_hash": question_hash, "question_length": len(payload.question), **service.last_audit_metadata})
    return result


@router.get("/{id}/questions/history", response_model=TenderQuestionHistoryResponse)
def get_tender_question_history(id: UUID, current_user: UserResponse = Depends(get_current_user), service: TenderQuestionService = Depends(get_tender_question_service)) -> TenderQuestionHistoryResponse:
    try:
        return service.history(id, current_user.id)
    except TenderQuestionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


@router.delete("/{id}/questions/history", status_code=status.HTTP_204_NO_CONTENT)
def clear_tender_question_history(id: UUID, current_user: UserResponse = Depends(get_current_user), service: TenderQuestionService = Depends(get_tender_question_service)) -> Response:
    try:
        service.clear_history(id, current_user.id)
    except TenderQuestionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)
