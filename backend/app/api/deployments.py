from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_api_token
from app.db.session import get_db
from app.models import ModelDeployment
from app.schemas import DeploymentCreate, DeploymentRead, DeploymentUpdate

router = APIRouter(
    prefix="/api/deployments",
    tags=["deployments"],
    dependencies=[Depends(require_api_token)],
)


@router.get("", response_model=list[DeploymentRead])
def list_deployments(db: Session = Depends(get_db)) -> list[ModelDeployment]:
    return list(db.scalars(select(ModelDeployment).order_by(ModelDeployment.model_name)).all())


@router.post("", response_model=DeploymentRead, status_code=201)
def create_deployment(
    payload: DeploymentCreate, db: Session = Depends(get_db)
) -> ModelDeployment:
    deployment = ModelDeployment(**payload.model_dump())
    db.add(deployment)
    db.commit()
    db.refresh(deployment)
    return deployment


@router.patch("/{deployment_id}", response_model=DeploymentRead)
def update_deployment(
    deployment_id: int, payload: DeploymentUpdate, db: Session = Depends(get_db)
) -> ModelDeployment:
    deployment = db.get(ModelDeployment, deployment_id)
    if deployment is None:
        raise HTTPException(status_code=404, detail="Deployment not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(deployment, key, value)
    db.commit()
    db.refresh(deployment)
    return deployment
