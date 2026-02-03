# Summary of the interaction: 
The expert explained that customers commonly struggle to find reliable service providers due to fragmented information sources, lack of verified credentials, and uncertainty around pricing and availability. This often leads to delayed decisions, inconsistent service quality, and dependency on informal referrals. From the service provider’s perspective, the expert noted that manual handling of requests, poor visibility of demand, and lack of scheduling tools make operations inefficient. A centralized platform enables providers to manage availability, pricing, and bookings more effectively.

 Trust was identified as a core domain concern. The expert emphasized that verification mechanisms, ratings, reviews, and platform-mediated support are critical in influencing customer choice. Price alone is not the deciding factor. perceived reliability and accountability matter more. The expert walked through typical workflows such as provider onboarding, service booking, job execution, and post-service issue handling. Provider verification before activation and explicit service definitions were highlighted as essential controls to minimize disputes. Operational challenges discussed included last-minute cancellations, provider no-shows, scope mismatches between customer expectations and delivered service, and delays in issue resolution.

 These challenges underline the need for clear rules, cancellation policies, and escalation mechanisms. Based on the interaction and domain analysis, it is evident that a platform like ServeEase must focus on transparency, structured workflows, and governance. Clearly defined domain terminology, actor responsibilities, and exception handling are fundamental to building a scalable and reliable system. Overall, the interaction validated the relevance of the problem statement and confirmed that a digital service discovery and booking platform addresses genuine pain points in the current ecosystem. The insights gathered directly inform the domain model, workflows, and assumptions used in the ServeEase project.

## Basic information:

**Domain**:   Digital Marketplace for services (non-retail) 

**Problem statement:** Service discovery and Booking platform (ServeEase) 

**Date of interaction:** January 28, 2026 

**Mode of interaction:** Video call (Zoom)

**Duration (in-minutes):** 30 minutes 

**Publicly accessible Video link:**  https://drive.google.com/file/d/1AhXORpDv0tw2zjuZwB021fofUlKTz9oZ/view?usp=drive\_link

## Domain Expert Details:

**Role/ designation:**  Associative Director at Urban Company

**Experience in the domain:** Over 7 years of experience at Urban Company as Director.

**Nature of work:** Managerial and Associative Director. 

## Domain Context and Terminology :
Q) How would you describe the overall purpose of this problem statement in your daily work?

The purpose of this problem statement in daily work is to bring structure, trust, and efficiency to the process of discovering and booking non-retail services. It addresses the lack of transparency in pricing, availability, and service quality by providing a centralized platform for customers and service providers. The platform reduces coordination effort, standardizes service interactions, and enables better monitoring and issue resolution, ultimately improving reliability and user satisfaction for all stakeholders.

Q) What are the primary goals or outcomes of this problem statement?

The primary goal of this problem statement is to make service discovery and booking **simple, reliable, and transparent** for non-retail services. It aims to help customers quickly find verified service providers, clearly understand pricing and availability, and confirm bookings without repeated coordination. At the same time, it enables service providers to manage their services, schedules, and bookings in a structured way.

Another key outcome is **building trust and accountability** in the service ecosystem through provider verification, ratings, reviews, and platform-level support. The problem statement also focuses on reducing operational issues such as cancellations, no-shows, and disputes by introducing standardized workflows and clear service definitions. Overall, the expected outcome is an efficient, scalable platform that improves customer satisfaction, service quality, and operational control for all stakeholders.

**List key terms used by the domain expert and their meanings:**
| Term | Meaning as explained by the expert |
|---|---|
| Service Category | A high-level grouping of similar services such as plumbing, electrical work, cleaning, or tutoring |  
| Service Listing | A published description of a service offered by a provider, including scope, price, and availability |  
| Provider Profile | A detailed page containing service provider information such as skills, experience, ratings, and reviews |  
| Rating & Review | Feedback given by customers after service completion to reflect service quality and reliability |  
| Cancellation Policy | Rules defining when and how a booking can be cancelled and any penalties involved |  
| No-show | A situation where either the customer or provider fails to appear for a confirmed booking |  
| Escalation | The process of forwarding unresolved issues from customer support to admin for final resolution |  
| Service Area | The geographic region where a service provider is willing to deliver services |  
| Platform Governance | Rules and controls enforced by the platform to maintain quality, trust, and compliance |  
| Booking Status | The current state of a booking such as requested, accepted, in-progress, completed, or cancelled |

## Actors and Responsibilities:

| Actor / Role | Responsibilities |
|---|---|
| Customer | Manages accounts, discovers services, books providers, and processes simulated payments. |
| Service Provider | Manages service listings (pricing, availability), handles booking requests, and updates service status. |
| Customer Support | Manages support tickets, resolves booking/payment issues, and communicates with users. |
| Admin | Handles user authentication, manages service categories, and monitors platform-wide activity and governance. |


## Core workflows

- **Workflow 1: Service Booking**
  - **Trigger / Start condition**
    - Customer searches for a service and selects a provider
  - **Steps involved (in order)**
    - Select date and time
    - Request booking
    - Provider accepts or rejects
    - Customer completes simulated payment
  - **Outcome / End condition**
    - Booking is confirmed and service record is created
 

- **Workflow 2: Issue Resolution**
  - **Trigger / Start condition**
    - Customer raises a support request regarding a service or payment issue
  - **Steps involved (in order)**
    -  Support ticket is generated and viewed by Customer Support
    -  Support agent communicates with both parties to investigate
    -  Agent resolves the issue or escalates it to Admin
  - **Outcome / End condition**
    - Issue is resolved or escalated, and resolution record is created

- **Workflow 3: Provider Onboarding**
  - **Trigger / Start condition**
    - A new service provider registers on the platform
  - **Steps involved (in order)**
    -  Provider creates a profile and submits it for review
    -  Admin reviews and approves the account
    -  Provider adds specific service details, pricing, and availability
  - **Outcome / End condition**
    - Provider is active and discoverable by customers


## Rules, Constraints, and Exceptions:

- **Mandatory rules or policies:**  
 All service providers must complete a verification process before they are allowed to accept bookings. Once a booking is accepted, both the customer and the service provider are expected to honor the agreed date, time, and service scope. Payments, cancellations, and service updates must be routed through the platform to maintain transparency and accountability.

- **Constraints or limitations:**  
 Service availability is constrained by the provider’s working hours, service area, and current bookings. Pricing may vary based on location, service complexity, or urgency. The platform’s ability to reassign providers is limited in cases where demand is high or services are location-specific.

- **Common exceptions or edge cases:**  
 Emergency or same-day service requests may bypass normal scheduling windows. Customers may request changes to service scope after booking, requiring renegotiation. Providers may occasionally cancel due to genuine reasons such as illness or equipment failure.

- **Situations where things usually go wrong:**  
 Issues commonly arise from last-minute cancellations, provider no-shows, mismatched expectations about service scope, unclear pricing, or delays in communication. Payment disputes and dissatisfaction also occur when service outcomes differ from customer expectations, requiring support or admin intervention.

## Current challenges and pain points :

- What parts of this process are most difficult or inefficient? 

The most difficult and inefficient part of the process is coordinating between customer expectations and service provider availability. Customers often expect immediate confirmation and fixed pricing, while providers may have changing schedules, variable service duration, or on-ground constraints. Managing cancellations and rescheduling, especially at the last minute, is also operationally challenging and affects overall service reliability.

- Where do delays, errors, or misunderstandings usually occur?

Delays, errors, and misunderstandings usually occur during booking confirmation, service scope clarification, and post-service communication. Miscommunication about what is included in a service, arrival time delays, or changes requested after booking frequently lead to dissatisfaction. Payment-related issues and unclear cancellation policies further contribute to disputes that require customer support intervention.

- What information is hardest to track or manage today? 

The hardest information to track and manage includes real-time provider availability, accurate service completion status, reasons for cancellations or no-shows, and consistent quality feedback from customers. Maintaining reliable records of service history, dispute resolutions, and provider performance over time is also challenging but essential for improving trust and decision-making on the platform.

## Assumptions & Clarifications :

- Assumptions made by the team that were confirmed:  
 The interaction confirmed the assumption that customers strongly prefer a single platform where they can compare service providers, view pricing and availability, and book services without repeated coordination. It was also confirmed that provider verification, ratings, and reviews play a critical role in building trust, and that digital payments and notifications are essential for smooth service coordination.

- Assumptions that were corrected:  
 It was clarified that pricing alone is not the primary decision factor for customers; reliability, responsiveness, and service quality are often more important. Another corrected assumption was that service workflows are straightforward— in practice, frequent exceptions such as rescheduling, scope changes, and cancellations require flexible handling and strong customer support rather than fully automated processes.

### Our Doubts,clarifications and follow-up Questions:

**Q) What assumptions were made during the design of the service discovery and booking platform?**

During the design, it was assumed that customers prefer a simple and centralized platform where they can quickly discover verified service providers, view pricing and availability, and confirm bookings without repeated calls or negotiations. It was also assumed that service providers are willing to adopt a digital system to manage their services, schedules, and customer interactions. Another assumption was that trust can be built through verification, ratings, and platform support, and that most users are comfortable with digital payments and notifications.


**Q) How is service availability managed in real time on the platform?**

Service availability is managed based on the service provider’s defined working hours, service areas, and current bookings. Providers update their availability on the platform, and once a booking is accepted, the corresponding time slot is blocked to avoid double booking. Any cancellations or rescheduling immediately update availability, ensuring customers see near real-time information when searching for services.


**Q) What performance, security, and reliability requirements are critical for this system?**

From a performance perspective, fast search results, quick booking confirmation, and real-time updates are critical. Security requirements include secure user authentication, protection of personal and payment information, and safe payment processing. Reliability is essential to ensure bookings are not lost, notifications are delivered correctly, and the platform remains available even during high traffic or peak service hours.


**Q) What tools or technologies are commonly used to build a service marketplace platform?**

Such platforms commonly use web and mobile application frameworks for the user interface, backend services to handle bookings and business logic, databases for storing user, service, and booking data, and third-party integrations for payments and notifications. Cloud infrastructure is often used to ensure scalability, availability, and easier maintenance.


**Q) How are notifications and updates delivered to users?**

Notifications and updates are delivered through multiple channels such as in-app notifications, emails, and mobile push notifications. These updates inform users about booking confirmations, provider responses, service reminders, cancellations, payment status, and support ticket updates, ensuring all parties stay informed throughout the service lifecycle.


**Q) Explain how the payment gateway works in the platform.**

The payment gateway acts as an intermediary between the customer, the platform, and the payment service provider. Once a booking is confirmed, the customer makes a payment through the gateway using supported methods. The payment is securely processed and recorded, and the platform tracks the transaction status. Payments are typically released to the service provider after successful service completion or based on platform policies.


**Q) How does the platform handle errors or failed bookings?**

If a booking fails due to availability issues, payment failure, or provider rejection, the platform immediately notifies the customer and updates the booking status. Customers may be prompted to retry payment, choose a different provider, or reschedule. Errors are logged for monitoring, and unresolved issues can be escalated to customer support for manual intervention.


**Q) What architectural approach is generally used for such a platform?**

A layered or service-based architecture is generally used, where user interfaces, business logic, and data management are clearly separated. This approach improves scalability, maintainability, and flexibility, allowing individual components such as booking management, payments, or notifications to evolve independently.


**Q) What type of database is suitable for this system, and why?**

A relational database is suitable for managing structured data such as users, bookings, services, and payments due to its consistency and transactional support. In addition, non-relational databases may be used for handling logs, notifications, or analytics data where flexibility and scalability are required.


**Q) Have you worked on similar types of projects earlier?**

The domain expert indicated experience with platforms involving service coordination, booking management, and customer support workflows. While not identical, prior work on service aggregation and operational systems provided practical insights into handling provider onboarding, booking conflicts, customer issues, and platform governance.

**Q) What are the core functionalities must service booking platform have?**

Core functionality of a service booking platform is ensuring high-quality supply. Without reliable and skilled service providers, the platform cannot meet user demand, and even first-time users will not return. Strong supply quality is therefore essential for customer satisfaction, trust, and long-term user retention.

**Q) What are the important features that we should include so that the customer or user may get satisfied?**

Customer satisfaction depends on trust and transparency. Key features include verifying professionals through background checks, clearly displaying their experience, and providing complete service information—such as the products used, the service procedure, and expected duration. By setting clear expectations upfront, the platform ensures a smooth experience and builds confidence for both customers and service providers.

**Q) What are mandatory rules to verify service provider**

Strong verification is essential for safety and trust. This includes validating official documents like Aadhaar and PAN cards, and conducting thorough background checks for any pending court cases or past issues. These measures ensure that service professionals are safe and reliable to enter customers’ homes.

**Q) How does the Customer Support actor work?**

The customer support actor acts as an intermediary between customers, service providers, and the platform to ensure smooth service delivery and issue resolution. In practice, customer support monitors incoming support tickets raised by customers or service providers related to bookings, payments, cancellations, or service quality. Once a ticket is received, the support team reviews the booking details, communication history, and service status to understand the issue clearly.

**Q) What are the exceptions/edge cases?**

Several situations that fall outside the normal service flow and require special handling. These include mismatches between customer expectations and the service actually delivered, even when professionals follow standard guidelines. Pricing conflicts are another edge case, as service providers prefer higher prices while customers expect lower ones, making fair price balancing difficult. Operational issues such as professionals arriving late or serious service-related incidents (for example, injuries during a service) also count as exceptions. Payment-related failures—where money is debited but not received—must be handled through automatic refunds. Additional edge cases include service providers not showing up after advance payment and providers repeatedly rejecting or canceling bookings, which require monitoring, intervention, and corrective action to maintain platform reliability and trust.

**Q) What happens if a service provider repeatedly cancels booking requests, and what actions can be taken?**

The platform addresses service provider reliability issues, specifically repeated booking cancellations, through a tiered system. Initially, the system tracks booking history and cancellation patterns, flagging frequent or last-minute cancellations. Service providers receive warnings and notifications, and may face temporary restrictions like limited booking acceptance or reduced visibility. More serious cases can lead to temporary suspension, requiring clarification or re-verification. If problems persist, the provider's account may be permanently deactivated to maintain service quality and customer trust. The platform aims to encourage responsible behavior and ensure reliable service delivery.

**Q) How does the notification system work?**

The notification system provides real-time communication between the platform, customers, and service providers. Notifications are triggered automatically by significant events like booking creation, acceptance, rejection, rescheduling, or cancellation. Customers receive notifications for booking confirmations, availability updates, reminders, and feedback requests. Service providers are notified of new booking requests, modifications/cancellations, and payment processing. Customer support/admins receive notifications for escalations, repeated cancellations, or policy violations.

**Q) What tools or technologies are commonly used to build such platforms?**

SQL,Java,Snowflake


###                                                                        —---------------   **END**  —------------------
