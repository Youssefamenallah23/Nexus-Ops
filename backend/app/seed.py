"""Seed synthetic demo data: users, projects, 22+ documents through the real pipeline.

Everything here is fictional. Run: uv run python -m app.seed

Seeding always uses the deterministic mock provider — no network, no keys, fast.
"""
import os

os.environ["NVIDIA_API_KEY"] = ""
os.environ["GOOGLE_API_KEY"] = ""

import random

from .db import Base, SessionLocal, engine
from .models import AuditEvent, Document, Extraction, Project, User, audit
from .services import pipeline

random.seed(42)  # deterministic seed data

USERS = [
    ("admin@nexus.test", "Claire Moreau", "administrator", "Administration"),
    ("manager@nexus.test", "Thomas Le Goff", "manager", "Project Management"),
    ("manager2@nexus.test", "Sofia Benali", "manager", "Field Operations"),
    ("employee@nexus.test", "Lucas Petit", "employee", "Field Operations"),
    ("employee2@nexus.test", "Emma Ropers", "employee", "Warehouse"),
    ("employee3@nexus.test", "Yann Kerbrat", "employee", "Engineering"),
    ("employee4@nexus.test", "Nadia Simon", "employee", "Administration"),
    ("employee5@nexus.test", "Marc Ozanne", "employee", "Project Management"),
]

PROJECTS = [
    ("Substation Rennes Nord", "MV substation renovation, phase 2."),
    ("Port Logistics Lighting", "LED relamping of warehouse B."),
    ("Wind Farm Cabling", "Internal cabling campaign, 12 turbines."),
]

DOCS = [
    ("quote_schneider_t4.txt",
     "SUPPLIER QUOTE — Schneider Electric France. Reference: QT-2026-0417. Supplier: Schneider Electric. "
     "Date: 2026-03-02. Valid until 2026-06-30. Items: 40x Masterpact MTZ2 breakers, unit price 1,240.00 EUR. "
     "Total: 49,600.00 EUR. Delivery: 2026-05-15. Contact: Marc Dubois. Payment terms: 30 days."),
    ("quote_abbswitchgear.txt",
     "Quotation from ABB France. Reference: ABB-Q-8891. Supplier: ABB. Medium voltage switchgear package. "
     "Total amount: 128,350 EUR. Lead time 8 weeks. Delivery date 2026-07-01. Contact requester: Thomas Le Goff."),
    ("quote_incomplete.txt",
     "Quotation — Câblerie Bretonne. Supplier: Câblerie Bretonne. We offer cable drums at best price. "
     "Total 4,200 EUR."),
    ("pr_led_warehouse.txt",
     "PURCHASE REQUEST. Reference: PR-2026-113. Requested by: Emma Ropers. Site: Port Logistics Warehouse B. "
     "Purchase 120 LED high-bay luminaires. Estimated amount: 21,600 EUR currency EUR. Needed by 2026-06-01."),
    ("pr_cable_drums.txt",
     "Purchase request PR-2026-118. Requester: Yann Kerbrat. Site: Rennes Depot. Buy 30 cable drums 4G25. "
     "Amount 9,800 EUR."),
    ("pr_no_amount.txt",
     "Purchase request from Nadia Simon. Site: Lannion Clinic. Purchase of 6 differential circuit breakers "
     "for panel replacement. Urgent."),
    ("intervention_pannel_R14.txt",
     "INTERVENTION REPORT. Site: Rennes Nord Substation, panel R14. Date: 2026-03-18. Technician: Lucas Petit. "
     "Incident: earth fault alarm on feeder 3. On-site repair of cable insulation, replaced 2 terminals. "
     "Downtime 2h40. Recommended follow-up inspection within 30 days."),
    ("intervention_blackout.txt",
     "Intervention report — Site: Port Logistics Warehouse B. Technician: Lucas Petit. Date 2026-03-22. "
     "Power outage at 03:14, cause: tripped main breaker after storm. Reset and tested. Urgent recommendation: "
     "surge protection study."),
    ("maint_overdue_genset.txt",
     "Maintenance report, generator G2, site Rennes Depot. Checklist partial: oil level ok. "
     "Servicing of cooling circuit postponed, parts missing."),
    ("minutes_kickoff_windfarm.txt",
     "MEETING MINUTES — Wind Farm Cabling kickoff. Date: 2026-03-05. Attendees: Thomas Le Goff, Yann Kerbrat, "
     "Claire Moreau. Agenda: cable routing, crane scheduling. Decision: route via service road east. "
     "Action items: Yann to order drums by 2026-04-01."),
    ("minutes_safety_review.txt",
     "Minutes of the quarterly safety review. Attendees: Claire Moreau, Sofia Benali, Emma Ropers, Lucas Petit. "
     "Meeting held 2026-02-20. Action items: update lockout procedure; refresher training in April."),
    ("quote_lighting_zfc.txt",
     "DEVIS — ZFC Éclairage. Reference: DEV-2026-774. Supplier: ZFC Éclairage. Project: Port Logistics Lighting. "
     "Line 1: 120 luminaires at 180 EUR. Total: 21,600 EUR. Validité: 2026-08-15. Contact: Pierre Vasseur."),
    ("pr_gloves.txt",
     "Purchase request. Requested by: Emma Ropers. Site: Rennes Depot. 200 pairs of insulated gloves class 0. "
     "Amount 2,400 EUR. Needed for the maintenance campaign."),
    ("intervention_planning.txt",
     "Intervention report. Site: Wind Farm Cabling, turbine 7. Technician: Yann Kerbrat. Date: 2026-03-25. "
     "Intervention on hub wiring connector, replaced damaged gland. Test ok."),
    ("maintenance_substation_annual.txt",
     "Annual maintenance report, Site: Rennes Nord Substation. Inspection of switchgear bay 2 completed. "
     "Thermography clean. Next due date 2027-03-01. Technician: Marc Ozanne."),
    ("minutes_monthly_ops.txt",
     "Monthly operations meeting minutes. Attendees: Sofia Benali, Thomas Le Goff, Marc Ozanne. Agenda: "
     "backlog of interventions, hiring. Action items: prioritize overdue maintenance; report to direction."),
    ("photo_receipt_march.txt",
     "Scanned receipt, parking Rennes, 12 EUR, 2026-03-14."),
    ("quote_permalloy.txt",
     "Offer from Permalloy Cables. Reference: OFF-2026-31. Supplier: Permalloy Cables. "
     "Total 17,250 EUR for 5 km 4G25 cable. Delivery 2026-09-15."),
    ("intervention_vague.txt",
     "Report. Someone came on site and fixed a problem in a panel. Things look ok now."),
    ("maint_transformer_T1.txt",
     "MAINTENANCE REPORT — Preventive inspection. Site: Rennes Nord Substation. Transformer T1. "
     "Date: 2026-03-10. Checklist: oil level ok, thermography ok, desiccant replaced. Next due: 2026-09-10. "
     "Technician: Marc Ozanne."),
    ("maint_generator_g2.txt",
     "Maintenance report for Site: Lannion Clinic, generator G2. Servicing completed: filters and coolant. "
     "Next inspection due 2026-10-01. Performed by Nadia Simon."),
    ("misc_site_visit.txt",
     "Notes from site visit at Lannion Clinic with the facilities manager. New building wing planned for 2027."),
]


def run():
    Base.metadata.create_all(engine)
    db = SessionLocal()
    # Dev seed = reset: wipe tables so reseeding is always reproducible.
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()

    users = {}
    for email, name, role, dept in USERS:
        u = User(email=email, name=name, role=role, department=dept)
        db.add(u)
        users[email] = u
    projects = {}
    for name, desc in PROJECTS:
        p = Project(name=name, description=desc)
        db.add(p)
        projects[name] = p
    db.commit()

    from .models import Task
    from .services.routing import create_task_for_document

    admins = [users["admin@nexus.test"], users["manager@nexus.test"], users["manager2@nexus.test"]]
    uploader_cycle = list(users.values())
    project_cycle = [None, projects["Substation Rennes Nord"], None, projects["Port Logistics Lighting"],
                     None, projects["Wind Farm Cabling"]]

    for i, (filename, text) in enumerate(DOCS):
        result = pipeline.process_document(text)
        cls = result["classification"]
        uploader = uploader_cycle[i % len(uploader_cycle)]
        project = project_cycle[i % len(project_cycle)]
        doc = Document(
            filename=filename, mime_type="text/plain", size_bytes=len(text.encode()),
            text_content=text, doc_type=cls["doc_type"], classification_confidence=cls["confidence"],
            department=cls["department"], uploaded_by=uploader.id,
            project_id=project.id if project else None,
        )
        db.add(doc)
        db.flush()
        db.add(Extraction(document_id=doc.id, revision=1, data=result["data"],
                          missing_fields=result["missing_fields"], confidence=result["confidence"], created_by="ai"))
        # ~60% approved (with task + audit trail), rest left in review for the demo
        if i % 5 < 3:
            reviewer = admins[i % len(admins)]
            doc.status = "approved"
            doc.reviewed_by = reviewer.id
            task = create_task_for_document(db, doc, reviewer)
            if i % 3 == 0:
                task.status = "completed"
            elif i % 3 == 1:
                task.status = "in_progress"
                task.assignee_id = uploader.id
            # some tasks are overdue so the reminder workflow has material
            if i % 4 == 2:
                from datetime import datetime, timedelta, timezone

                task.due_date = datetime.now(timezone.utc) - timedelta(days=2)
        db.add(AuditEvent(actor_id=uploader.id, actor_label=uploader.name, action="document.uploaded",
                          entity_type="document", entity_id=str(doc.id), detail={"filename": filename}))
        db.add(AuditEvent(actor_label="ai:classification-agent", action="ai.classified",
                          entity_type="document", entity_id=str(doc.id), detail=cls))
        db.commit()

    db.add(AuditEvent(actor_label="system", action="seed.completed", entity_type="system",
                      detail={"documents": len(DOCS)}))
    db.commit()

    # Ingest approved documents into the copilot knowledge base.
    from .services.rag import ingest_document

    ingested = sum(ingest_document(db, d) for d in db.query(Document).filter(Document.status == "approved"))

    # Demo workflow executions (mock mode — n8n not connected during seed).
    from .services.n8n import emit

    wf_count = 0
    for d in db.query(Document).filter(Document.status == "approved").all():
        task = db.query(Task).filter(Task.document_id == d.id).one_or_none()
        if task:
            emit(db, workflow_type="document_approved", entity_type="document", entity_id=str(d.id),
                 payload={"document_id": str(d.id), "filename": d.filename, "doc_type": d.doc_type,
                          "department": task.department, "task_id": str(task.id), "task_title": task.title})
            wf_count += 1

    db.add(AuditEvent(actor_label="system", action="copilot.indexed", entity_type="copilot",
                      detail={"chunks": ingested}))
    db.commit()
    print(f"Seeded {len(USERS)} users, {len(PROJECTS)} projects, {len(DOCS)} documents, "
          f"{ingested} copilot chunks, {wf_count} workflow executions.")


if __name__ == "__main__":
    run()


