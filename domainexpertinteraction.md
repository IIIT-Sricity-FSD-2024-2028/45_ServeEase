**Summary of the interaction:**  
The expert explained that customers commonly struggle to find reliable service providers due to fragmented information sources, lack of verified credentials, and uncertainty around pricing and availability. This often leads to delayed decisions, inconsistent service quality, and dependency on informal referrals. From the service provider’s perspective, the expert noted that manual handling of requests, poor visibility of demand, and lack of scheduling tools make operations inefficient. A centralized platform enables providers to manage availability, pricing, and bookings more effectively. Trust was identified as a core domain concern. The expert emphasized that verification mechanisms, ratings, reviews, and platform-mediated support are critical in influencing customer choice. Price alone is not the deciding factor. perceived reliability and accountability matter more. The expert walked through typical workflows such as provider onboarding, service booking, job execution, and post-service issue handling. Provider verification before activation and explicit service definitions were highlighted as essential controls to minimize disputes. Operational challenges discussed included last-minute cancellations, provider no-shows, scope mismatches between customer expectations and delivered service, and delays in issue resolution. These challenges underline the need for clear rules, cancellation policies, and escalation mechanisms. Based on the interaction and domain analysis, it is evident that a platform like ServeEase must focus on transparency, structured workflows, and governance. Clearly defined domain terminology, actor responsibilities, and exception handling are fundamental to building a scalable and reliable system. Overall, the interaction validated the relevance of the problem statement and confirmed that a digital service discovery and booking platform addresses genuine pain points in the current ecosystem. The insights gathered directly inform the domain model, workflows, and assumptions used in the ServeEase project.

**Basic information:**

**Domain**:   Digital Marketplace for services (non-retail) 

**Problem statement:** Service discovery and Booking platform (ServeEase) 

**Date of interaction:** January 28, 2026 

**Mode of interaction:** Video call 

**Duration (in-minutes):** 30 minutes 

**Publicly accessible Video link:**  https://drive.google.com/file/d/1AhXORpDv0tw2zjuZwB021fofUlKTz9oZ/view?usp=drive\_link

**Domain Expert Details**:

Role/ designation:  Operations Manager (Service Aggregation Platforms) at Urban Company

Experience in the domain:Over 8 years managing service marketplaces, provider onboarding, service quality audits, and customer escalations.

Nature of work: Managerial and Operational. 

Domain Context and Terminology :  
How would you describe the overall purpose of this problem statement in your daily work?

The purpose is to bridge the gap between customers needing essential home services and reliable providers in an unorganized market. 

What are the primary goals or outcomes of this problem statement?

To provide transparency in pricing and availability, reduce time spent searching for providers, and ensure efficient service tracking. 

List key terms used by the domain expert and their meanings:

Term	Meaning as explained by the expert  
Non-retail services	  
Professional services like plumbing, cleaning, or tutoring rather than physical goods. 

Service Discovery	  
The process where a customer searches and filters for specific services based on location and category. 

Simulated Payment	  
A test or mock transaction used to confirm a booking within the platform. 

Governance	  
The enforcement of platform rules and monitoring of user/provider activities. 

Actors and Responsibilities  
Identify the different roles involved and what they do in practice.

Actor / Role	Responsibilities  
Customer	  
Manages accounts, discovers services, books providers, and processes simulated payments. 

Service Provider	  
Manages service listings (pricing, availability), handles booking requests, and updates service status. 

Customer Support	  
Manages support tickets, resolves booking/payment issues, and communicates with users. 

Admin	  
Handles user authentication, manages service categories, and monitors platform-wide activity and governance. 

Core workflows  
Workflow 1: Service Booking

Trigger/start condition: Customer searches for a service and selects a provider. 

Steps involved (in order): 1\. Select date and time.  2\. Request booking.  3\. Provider accepts or rejects.  4\. Customer completes simulated payment. 

Outcome / End condition: Booking is confirmed and service record is created. 

Workflow 2: Issue Resolution

Trigger/start condition: Customer raises a support request regarding a service or payment issue. 

Steps involved (in order): 1\. Support ticket is generated and viewed by Customer Support.  2\. Support agent communicates with both parties to investigate.  3\. Agent resolves the issue or escalates it to Admin. 

Outcome / End condition: Issue is resolved or escalated for final governance. 

Workflow 3: Provider Onboarding

Trigger/start condition: A new service provider registers on the platform. 

Steps involved (in order): 1\. Provider creates a profile and submits it for review.  2\. Admin reviews and approves the account.  3\. Provider adds specific service details, pricing, and availability. 

Outcome / End condition: Provider is active and discoverable by customers. 

Rules, Constraints, and Exceptions

Mandatory rules or policies: Admins must approve all service provider accounts before they can list services. 

Constraints or limitations: Payments are currently simulated and limited to platform-specific tracking. 

Common exceptions or edge cases: Providers may reject booking requests based on their real-time availability. 

Situations where things usually go wrong: Miscommunication between the customer and provider regarding the specific scope of the service needed. 

Current challenges and pain points

What parts of this process are most difficult or inefficient? The lack of transparency in traditional service markets makes it hard for customers to trust pricing. 

Where do delays, errors, or misunderstandings usually occur? Misunderstandings often occur regarding the specific repair requirements at the job site. 

What information is hardest to track or manage today? Tracking the exact status of a service from "Booked" to "Completed" is often inefficient without a unified tool. 

Assumptions & Clarifications

Assumption: It is assumed that the simulated payment system will eventually transition to a real-world gateway in future iterations. 

Clarification: The platform is primarily web-based as per current planning but may require mobile accessibility for providers on the go.  
