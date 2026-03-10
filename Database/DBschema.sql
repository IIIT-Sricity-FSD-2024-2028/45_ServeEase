-- Create Database
CREATE DATABASE ServeEaseDB;
USE ServeEaseDB;

-- TABLE: ADDRESS
CREATE TABLE ADDRESS (
    address_id      INT AUTO_INCREMENT PRIMARY KEY,
    address_line    VARCHAR(255) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100) NOT NULL,
    pincode         VARCHAR(20)  NOT NULL,
    country         VARCHAR(100) NOT NULL
);

-- TABLE: CUSTOMER
CREATE TABLE CUSTOMER (
    customer_id     INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    phone           VARCHAR(20)  NOT NULL UNIQUE,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    account_status  ENUM('active','inactive','blocked')
                    NOT NULL DEFAULT 'active'
);

-- TABLE: ADMIN
CREATE TABLE ADMIN (
    admin_id    INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        ENUM('super_admin','verification_admin','category_manager','operations_admin') NOT NULL DEFAULT 'operations_admin'
);

-- TABLE: CUSTOMER_SUPPORT_STAFF
CREATE TABLE CUSTOMER_SUPPORT_STAFF (
    support_id  INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        ENUM('complaint_handler','technical_support','refund_support','general_support') NOT NULL DEFAULT 'general_support',
    phone       VARCHAR(20) NOT NULL UNIQUE
);

-- TABLE: SERVICE_CATEGORY
CREATE TABLE SERVICE_CATEGORY (
    category_id     INT AUTO_INCREMENT PRIMARY KEY,
    category_name   VARCHAR(150) NOT NULL UNIQUE,
    description     TEXT
);

-- TABLE: SERVICE_PROVIDER
CREATE TABLE SERVICE_PROVIDER (
    provider_id         INT AUTO_INCREMENT PRIMARY KEY,
    name                VARCHAR(100) NOT NULL,
    email               VARCHAR(150) NOT NULL UNIQUE,
    password            VARCHAR(255) NOT NULL,
    phone               VARCHAR(20) NOT NULL UNIQUE,
    experience_years    INT NOT NULL DEFAULT 0,
    verification_status ENUM('pending','verified','rejected','suspended')
                        NOT NULL DEFAULT 'pending',
    average_rating      DECIMAL(3,2) DEFAULT 0.00,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TABLE: SERVICE_LISTING
CREATE TABLE SERVICE_LISTING (
    service_id          INT AUTO_INCREMENT PRIMARY KEY,
    provider_id         INT NOT NULL,
    category_id         INT NOT NULL,
    service_name        VARCHAR(150) NOT NULL,
    description         TEXT NOT NULL,
    service_inclusions  TEXT,
    base_price          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    service_duration    INT NOT NULL,
    active_status       ENUM('active','inactive') NOT NULL DEFAULT 'active',

    CONSTRAINT uq_provider_service
        UNIQUE (provider_id, service_name),

    CONSTRAINT fk_service_provider
        FOREIGN KEY (provider_id)
        REFERENCES SERVICE_PROVIDER(provider_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_service_category
        FOREIGN KEY (category_id)
        REFERENCES SERVICE_CATEGORY(category_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- TABLE: AVAILABILITY_SLOT
CREATE TABLE AVAILABILITY_SLOT (
    slot_id         INT AUTO_INCREMENT PRIMARY KEY,
    provider_id     INT NOT NULL,
    service_id      INT NOT NULL,
    available_date  DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    slot_status     ENUM('available','booked','blocked','expired')
                    NOT NULL DEFAULT 'available',

    CONSTRAINT uq_provider_service_slot
        UNIQUE (provider_id, service_id, available_date, start_time, end_time),

    CONSTRAINT fk_slot_provider
        FOREIGN KEY (provider_id)
        REFERENCES SERVICE_PROVIDER(provider_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

  CONSTRAINT fk_slot_service
        FOREIGN KEY (service_id)
        REFERENCES SERVICE_LISTING(service_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- TABLE: SERVICE_REQUEST
CREATE TABLE SERVICE_REQUEST (
    request_id              INT AUTO_INCREMENT PRIMARY KEY,
    customer_id             INT NOT NULL,
    service_id              INT NOT NULL,
    provider_id             INT NOT NULL,
    address_id              INT NOT NULL,
    requested_date          DATE NOT NULL,
    requested_time          TIME NOT NULL,
    request_status          ENUM('pending','accepted','rejected','expired','converted') NOT NULL DEFAULT 'pending',
    provider_response_time  DATETIME DEFAULT NULL,

    CONSTRAINT fk_request_customer
        FOREIGN KEY (customer_id)
        REFERENCES CUSTOMER(customer_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_request_service
        FOREIGN KEY (service_id)
        REFERENCES SERVICE_LISTING(service_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_request_provider
        FOREIGN KEY (provider_id)
        REFERENCES SERVICE_PROVIDER(provider_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_request_address
        FOREIGN KEY (address_id)
        REFERENCES ADDRESS(address_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- TABLE: BOOKING
CREATE TABLE BOOKING (
    booking_id      INT AUTO_INCREMENT PRIMARY KEY,
    customer_id     INT NOT NULL,
    provider_id     INT NOT NULL,
    service_id      INT NOT NULL,
    slot_id         INT NOT NULL UNIQUE,
    address_id      INT NOT NULL,
    booking_date    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    booking_status  ENUM('pending','confirmed','in_progress','completed','cancelled') NOT NULL DEFAULT 'pending',
    total_price     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    completion_time DATETIME DEFAULT NULL,

    CONSTRAINT fk_booking_customer
        FOREIGN KEY (customer_id)
        REFERENCES CUSTOMER(customer_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_booking_provider
        FOREIGN KEY (provider_id)
        REFERENCES SERVICE_PROVIDER(provider_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_booking_service
        FOREIGN KEY (service_id)
        REFERENCES SERVICE_LISTING(service_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_booking_slot
        FOREIGN KEY (slot_id)
        REFERENCES AVAILABILITY_SLOT(slot_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT fk_booking_address
        FOREIGN KEY (address_id)
        REFERENCES ADDRESS(address_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- TABLE: PAYMENT
CREATE TABLE PAYMENT (
    payment_id      INT AUTO_INCREMENT PRIMARY KEY,
    booking_id      INT NOT NULL UNIQUE,
    amount          DECIMAL(10,2) NOT NULL,
    payment_method  ENUM('upi','card','net_banking','wallet','cash') NOT NULL,
    payment_status  ENUM('pending','success','failed','refunded')
                    NOT NULL DEFAULT 'pending',
    transaction_id  VARCHAR(150) NOT NULL UNIQUE,
    payment_date    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_payment_booking
        FOREIGN KEY (booking_id)
        REFERENCES BOOKING(booking_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- TABLE: CANCELLATION
CREATE TABLE CANCELLATION (
    cancellation_id     INT AUTO_INCREMENT PRIMARY KEY,
    booking_id          INT NOT NULL UNIQUE,
    cancelled_by        ENUM('customer','provider','admin','system') NOT NULL,
    cancellation_reason TEXT NOT NULL,
    cancellation_time   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    refund_status       ENUM('not_applicable','pending','processed','rejected') NOT NULL DEFAULT 'not_applicable',
    CONSTRAINT fk_cancellation_booking
        FOREIGN KEY (booking_id)
        REFERENCES BOOKING(booking_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- TABLE: BOOKING_MODIFICATION
CREATE TABLE BOOKING_MODIFICATION (
    modification_id     INT AUTO_INCREMENT PRIMARY KEY,
    booking_id          INT NOT NULL,
    old_slot_id         INT DEFAULT NULL,
    new_slot_id         INT DEFAULT NULL,
    old_service_id      INT DEFAULT NULL,
    new_service_id      INT DEFAULT NULL,
    modification_reason TEXT NOT NULL,
    modification_time   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_mod_booking
        FOREIGN KEY (booking_id)
        REFERENCES BOOKING(booking_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_mod_old_slot
        FOREIGN KEY (old_slot_id)
        REFERENCES AVAILABILITY_SLOT(slot_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_mod_new_slot
        FOREIGN KEY (new_slot_id)
        REFERENCES AVAILABILITY_SLOT(slot_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_mod_old_service
        FOREIGN KEY (old_service_id)
        REFERENCES SERVICE_LISTING(service_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    CONSTRAINT fk_mod_new_service
        FOREIGN KEY (new_service_id)
        REFERENCES SERVICE_LISTING(service_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- TABLE: REVIEW_RATING
CREATE TABLE REVIEW_RATING (
    review_id       INT AUTO_INCREMENT PRIMARY KEY,
    booking_id      INT NOT NULL UNIQUE,
    customer_id     INT NOT NULL,
    provider_id     INT NOT NULL,
    rating          INT NOT NULL,
    review_text     TEXT,
    review_date     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_rating_range
        CHECK (rating BETWEEN 1 AND 5),

    CONSTRAINT fk_review_booking
        FOREIGN KEY (booking_id)
        REFERENCES BOOKING(booking_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_review_customer
        FOREIGN KEY (customer_id)
        REFERENCES CUSTOMER(customer_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_review_provider
        FOREIGN KEY (provider_id)
        REFERENCES SERVICE_PROVIDER(provider_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);


-- TABLE: SUPPORT_TICKET
CREATE TABLE SUPPORT_TICKET (
    ticket_id       INT AUTO_INCREMENT PRIMARY KEY,
    customer_id     INT NOT NULL,
    booking_id      INT NOT NULL,
    support_id      INT DEFAULT NULL,
    issue_type      VARCHAR(100) NOT NULL,
    description     TEXT NOT NULL,
    ticket_status   ENUM('open','in_progress','resolved','closed','escalated') NOT NULL DEFAULT 'open',
 CONSTRAINT fk_ticket_customer
        FOREIGN KEY (customer_id)
        REFERENCES CUSTOMER(customer_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_ticket_booking
        FOREIGN KEY (booking_id)
        REFERENCES BOOKING(booking_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_ticket_support
        FOREIGN KEY (support_id)
        REFERENCES CUSTOMER_SUPPORT_STAFF(support_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- TABLE: NOTIFICATION
CREATE TABLE NOTIFICATION (
    notification_id     INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL,
    user_role           ENUM('customer','provider','admin') NOT NULL,
    message             TEXT NOT NULL,
    notification_type   VARCHAR(50) NOT NULL,
    status              ENUM('unread','read','archived')
                        NOT NULL DEFAULT 'unread'
);

-- TABLE: PROVIDER_DOCUMENT
CREATE TABLE PROVIDER_DOCUMENT (
    document_id         INT AUTO_INCREMENT PRIMARY KEY,
    provider_id         INT NOT NULL,
    document_type       VARCHAR(100) NOT NULL,
    document_url        TEXT NOT NULL,
    verification_status ENUM('pending','verified','rejected')
                        NOT NULL DEFAULT 'pending',
    uploaded_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_by_admin   INT DEFAULT NULL,
    verification_date   DATETIME DEFAULT NULL,

    CONSTRAINT uq_provider_document
        UNIQUE (provider_id, document_type),

    CONSTRAINT fk_document_provider
        FOREIGN KEY (provider_id)
        REFERENCES SERVICE_PROVIDER(provider_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_document_admin
        FOREIGN KEY (verified_by_admin)
        REFERENCES ADMIN(admin_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);
