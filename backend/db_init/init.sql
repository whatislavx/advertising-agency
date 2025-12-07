CREATE TYPE user_role AS ENUM ('client', 'manager', 'director');
CREATE TYPE order_status AS ENUM ('new', 'paid', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    personal_discount INTEGER DEFAULT 0,
    order_count INTEGER DEFAULT 0, 

    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'other', 

    description TEXT,
    base_price DECIMAL(10, 2) NOT NULL,
    image_path VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE
);

CREATE TABLE resources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, 

    cost DECIMAL(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE
);

CREATE TABLE service_resources (
    service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
    resource_id INTEGER REFERENCES resources(id) ON DELETE CASCADE,
    PRIMARY KEY (service_id, resource_id)
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    service_id INTEGER REFERENCES services(id),
    status order_status DEFAULT 'new',
    event_date DATE NOT NULL,
    end_date DATE,
    total_cost DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE service_views (
    id SERIAL PRIMARY KEY,
    service_id INTEGER REFERENCES services(id),
    user_id INTEGER REFERENCES users(id),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_resources (
    order_id INTEGER REFERENCES orders(id),
    resource_id INTEGER REFERENCES resources(id),
    PRIMARY KEY (order_id, resource_id)
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    amount DECIMAL(10, 2) NOT NULL,
    status payment_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO services (name, type, base_price) VALUES 
    ('Зовнішня реклама (Білборди)', 'outdoor', 15000.00),
    ('Реклама в Instagram', 'internet', 8000.00),
    ('Реклама на ТБ', 'tv', 50000.00);

INSERT INTO resources (name, type, cost) VALUES 
    ('Оренда камери', 'equipment', 3000.00),
    ('Оператор', 'personnel', 2500.00),
    ('Монтажер', 'personnel', 4000.00),
    ('Копірайтер', 'personnel', 2000.00),
    ('Дизайнер', 'personnel', 3500.00),
    ('Фотограф', 'personnel', 2800.00);

INSERT INTO users (email, password_hash, role, first_name, last_name) VALUES
    ('client@example.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'client', 'Іван', 'Клієнтович'),
    ('manager@example.com', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 'manager', 'Петро', 'Менеджеренко');

INSERT INTO service_views (service_id, user_id, viewed_at) VALUES
    (1, 1, NOW() - INTERVAL '1 month'), (1, 1, NOW() - INTERVAL '1 month'), 
    (1, 1, NOW() - INTERVAL '1 month'), (1, 1, NOW() - INTERVAL '1 month'), 
    (1, 1, NOW() - INTERVAL '1 month');

INSERT INTO orders (service_id, user_id, status, total_cost, event_date, created_at) VALUES
    (1, 1, 'paid', 5000, CURRENT_DATE, NOW() - INTERVAL '1 month');