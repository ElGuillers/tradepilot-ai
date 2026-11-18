from typing import List
from fastapi import APIRouter, HTTPException
from app.alerts.manager import alert_manager
from app.schemas.alerts import AlertCreate, AlertResponse, AlertNotification

router = APIRouter(tags=["Alerts"])


@router.get("/alerts", response_model=List[AlertResponse])
async def list_alerts():
    return alert_manager.list_alerts()


@router.post("/alerts", response_model=AlertResponse)
async def create_alert(alert_in: AlertCreate):
    return alert_manager.create_alert(alert_in)


@router.delete("/alerts/{alert_id}")
async def delete_alert(alert_id: int):
    success = alert_manager.delete_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    return {"message": "Alerta eliminada correctamente", "id": alert_id}


@router.get("/alerts/notifications", response_model=List[AlertNotification])
async def get_notifications():
    return alert_manager.list_notifications()


@router.post("/alerts/notifications/read-all")
async def mark_all_notifications_read():
    count = alert_manager.mark_all_read()
    return {"message": "Todas las notificaciones marcadas como leídas", "updated": count}


@router.post("/alerts/notifications/{notif_id}/read")
async def mark_single_notification_read(notif_id: str):
    success = alert_manager.mark_read(notif_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    return {"message": "Notificación marcada como leída", "id": notif_id}
