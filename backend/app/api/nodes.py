from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_api_token
from app.db.session import get_db
from app.models import InferenceNode
from app.schemas import NodeCreate, NodeRead, NodeUpdate

router = APIRouter(prefix="/api/nodes", tags=["nodes"], dependencies=[Depends(require_api_token)])


@router.get("", response_model=list[NodeRead])
def list_nodes(db: Session = Depends(get_db)) -> list[InferenceNode]:
    return list(db.scalars(select(InferenceNode).order_by(InferenceNode.name)).all())


@router.post("", response_model=NodeRead, status_code=201)
def create_node(payload: NodeCreate, db: Session = Depends(get_db)) -> InferenceNode:
    node = InferenceNode(**payload.model_dump(), last_heartbeat_at=datetime.utcnow())
    db.add(node)
    db.commit()
    db.refresh(node)
    return node


@router.get("/{node_id}", response_model=NodeRead)
def get_node(node_id: int, db: Session = Depends(get_db)) -> InferenceNode:
    node = db.get(InferenceNode, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    return node


@router.patch("/{node_id}", response_model=NodeRead)
def update_node(node_id: int, payload: NodeUpdate, db: Session = Depends(get_db)) -> InferenceNode:
    node = db.get(InferenceNode, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(node, key, value)
    node.last_heartbeat_at = datetime.utcnow()
    db.commit()
    db.refresh(node)
    return node


@router.delete("/{node_id}", status_code=204)
def delete_node(node_id: int, db: Session = Depends(get_db)) -> None:
    node = db.get(InferenceNode, node_id)
    if node is None:
        raise HTTPException(status_code=404, detail="Node not found")
    db.delete(node)
    db.commit()
