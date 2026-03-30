# ------------------------------------------------------------------------------------------------
# Custom Dockerfile for RabbitMQ 3.13-management image for cl-reporter project
#
# @since agentic-flow--JP
#
# - Installs delayed message exchange plugin (x-delayed-message) 
#   Used so orders-srv can publish order.expired with delayMs for broker-side scheduling.
# ------------------------------------------------------------------------------------------------
FROM docker.io/rabbitmq:3.13-management

# Plugin v3.13.0 for RabbitMQ 3.13.x (https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases)
RUN set -eux; \
    apt-get update && apt-get install -y --no-install-recommends curl ca-certificates; \
    curl -fSL -o /opt/rabbitmq/plugins/rabbitmq_delayed_message_exchange-3.13.0.ez \
    "https://github.com/rabbitmq/rabbitmq-delayed-message-exchange/releases/download/v3.13.0/rabbitmq_delayed_message_exchange-3.13.0.ez"; \
    rabbitmq-plugins enable rabbitmq_delayed_message_exchange; \
    apt-get purge -y --auto-remove curl ca-certificates; \
    rm -rf /var/lib/apt/lists/*
