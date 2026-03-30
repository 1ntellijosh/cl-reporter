# Makefile for cl-reporter project

.PHONY: commit push sq schema-change-migration scheme-change-migration db\:psql


# GIT COMMANDS

com:
	git add .
	git commit -a

push:
	git push origin

sq:
	@N=$(word 2,$(MAKECMDGOALS)); \
	if [ -z "$$N" ]; then \
			echo "Usage: make sq <number_of_commits>"; \
			echo "Example: make sq 3"; \
			exit 1; \
	fi; \
	git rebase -i HEAD~$$N

# Prevent Make from trying to build the number as a target
%:
	@:

# APP DEVELOPMENT COMMANDS

##
# APP INIT COMMAND:
# --------------------------
# Prerequisites:
# ---------------
# - MAKE           - https://www.gnu.org/software/make/
# - Ansible        - https://docs.ansible.com/ansible/latest/installation/index.html
#
init:
	@command -v ansible-playbook >/dev/null 2>&1 || { echo "Ansible not found. Install with: pip3 install --user ansible  or  sudo apt install ansible"; exit 127; }
	ansible-playbook ./ops/ansible/init.yml -K

##
# LOCAL APP RUNNING COMMANDS:
# --------------------------
# Prerequisites:
# ---------------
# - MAKE           - https://www.gnu.org/software/make/
# - Ansible        - https://docs.ansible.com/ansible/latest/installation/index.html
# - Node.js/NPM    - https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
# - Docker         - https://docs.docker.com/get-started/get-docker/#supported-platforms
# - kubectl  	   - https://kubernetes.io/docs/tasks/tools/
# - Kind     	   - https://kind.sigs.k8s.io/docs/user/quick-start/#installation
# - Skaffold 	   - https://skaffold.dev/docs/install/#standalone-binary
#
full-clear:
	@echo "CLEARING ALL LOCAL REPORTER CLUSTER AND DOCKER IMAGES..."
	$(MAKE) clear-dev-images
	-$(MAKE) destroy 2>/dev/null || true
	@echo "Clear complete."

destroy:
	@echo "DESTROYING LOCAL REPORTER CLUSTER..."
	@echo "Deleting Kind cluster (removes cluster and all pods, deployments, services, ingresses)..."
	-$(MAKE) kstop 2>/dev/null || true
	@echo "Stop complete."

start:
	@echo "CREATING LOCAL REPORTER CLUSTER..."
	ansible-playbook ./ops/ansible/setup-cluster.yml
	$(MAKE) dev

dev:
	@echo "RUNNING DEVELOPMENT ENVIRONMENT (skaffold)..."
	@skaffold dev -f skaffold.dev.yml

##
# KIND COMMANDS:
# --------------------------

# Load Docker images into Kind cluster
kload-imgs:
	kind load docker-image 1ntellijosh/cl-reporter-oauth-api:latest --name reporter-cluster
	kind load docker-image 1ntellijosh/cl-reporter-client:latest --name reporter-cluster

# Create a new Kind cluster with the config file
kstart:
	kind create cluster --name reporter-cluster --config ./ops/kind/config.yml

# Stop/delete Kind cluster
kstop:
	-kind delete cluster --name reporter-cluster

##
# KUBECTL COMMANDS:
# --------------------------

# App's ingress resource expects an NGINX Ingress Controller to be installed. Kind doesn't ship one, so install it with this:
init-ingress:
	kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for ingress-nginx controller deployment (pods may not exist yet right after apply)
wait-ingress:
	kubectl wait --namespace ingress-nginx --for=condition=available deployment/ingress-nginx-controller --timeout=90s
	@sleep 10

# Retry apply (admission webhook can be slow to accept connections after controller is ready)
apply-ingress:
	@for i in 1 2 3 4 5 6 7 8; do \
		echo "Applying ingress (attempt $$i)..."; \
		kubectl apply -f ./ops/k8s/overlays/dev/ingress-srv.yml && exit 0; \
		sleep 8; \
		done; exit 1

apply-deployments:
	kubectl apply -f ./ops/k8s/base/deployments/oauth-api.yml
	kubectl apply -f ./ops/k8s/base/deployments/client.yml

# Context commands (for managing/switching between local kind cluster and AWS EKS cluster)
list-ctxs:
	kubectl config get-contexts

current-ctx:
	kubectl config current-context

# Switch kubectl context. Usage: make use-context CONTEXT=kind-reporter-cluster (or CONTEXT=arn:aws:eks:...)
use-ctx:
	@if [ -z "$${CTX}" ]; then \
		echo "Usage: make use-ctx CTX=<context-name>"; \
		echo ""; \
		echo "Available contexts:"; \
		kubectl config get-contexts -o name; \
		exit 1; \
	fi
	kubectl config use-context $${CTX}

# Postgres StatefulSet + Services (see docs/architecture-v1.md §8.1; used by setup-cluster.yml)
apply-postgres-db:
	kubectl apply -f ./ops/k8s/overlays/dev/storageclass-local.yml
	kubectl apply -f ./ops/k8s/base/statefulsets/postgres-db.yml

# Wait for Postgres pod after apply-postgres-db (setup-cluster.yml runs this before apply-deployments)
wait-postgres-db:
	kubectl rollout status statefulset/cl-reporter-db-statefulset -n default --timeout=180s

# Create messaging namespace (for RabbitMQ etc.) if missing; idempotent
add-messaging-namespace:
	kubectl create namespace messaging --dry-run=client -o yaml | kubectl apply -f -

cluster-status:
	@echo "--------------------------- CLUSTER STATUS ------------------------------"
	@echo "--- PODS:"
	kubectl get pods
	kubectl get pods -n messaging

	@echo ""
	@echo "--- SERVICES:"
	kubectl get svc
	@echo ""
	@echo "--- INGRESSES:"
	kubectl get ingress
	@echo ""
	@echo "--- SECRETS:"
	kubectl get secrets
	@echo ""
	@echo "--- NAMESPACES:"
	kubectl get namespaces
	@echo ""
	kubectl cluster-info --context kind-reporter-cluster
	@echo "-------------------------------------------------------------------------"		

##
# BUILD COMMANDS:
# --------------------------

# Build RabbitMQ image with delayed message exchange plugin (used by setup-cluster.yml)
build-rabbitmq-image:
	docker build -t reporter-rabbitmq:3.13-management -f ./ops/docker/rabbitmq/Dockerfile .

build-oauth-api-dev-image:
	docker build -f ./ops/docker/oauth-api/dev.Dockerfile -t 1ntellijosh/cl-reporter-oauth-api:latest .

build-client-dev-image:
	docker build -f ./ops/docker/client/dev.Dockerfile -t 1ntellijosh/cl-reporter-client:latest .

build-dev-images:
	$(MAKE) build-oauth-api-dev-image
	$(MAKE) build-client-dev-image

clear-dev-images:
	@echo "Removing app Docker images (1ntellijosh/cl-reporter-*)..."
	IMGS=$$(docker images '1ntellijosh/cl-reporter-*' -q 2>/dev/null); \
	[ -z "$$IMGS" ] || docker rmi -f $$IMGS 2>/dev/null || true

bs:
	$(MAKE) build-shared-packages
build-shared-packages:
	@echo "Building shared packages..."
	npm install
	rm -f packages/tsconfig.tsbuildinfo && cd packages && npm run build

##
# DATABASE COMMANDS:
# --------------------------

# Drizzle migrations (ops/database/migrations). If DATABASE_URL is unset, uses kubectl port-forward to cl-reporter-db-srv:15432→5432 (Kind local dev).
db\:migrate:
	@if [ -n "$$DATABASE_URL" ]; then \
		npm run db:migrate -w @reporter/core; \
	else \
		set -e; \
		kubectl port-forward svc/cl-reporter-db-srv 15432:5432 -n default & \
		PF_PID=$$!; \
		trap 'kill $$PF_PID 2>/dev/null || true' EXIT; \
		sleep 2; \
		DB_URL_ENC=$$(kubectl get secret database-url -n default -o jsonpath='{.data.DATABASE_URL}' 2>/dev/null || true); \
		DB_URL=$$(echo "$$DB_URL_ENC" | base64 -d); \
		DATABASE_URL=$$(node -e "const u=new URL(process.argv[1]); u.hostname='127.0.0.1'; u.port='15432'; console.log(u.toString())" "$$DB_URL"); \
		export DATABASE_URL; \
		npm run db:migrate -w @reporter/core; \
	fi

# After editing packages/src/drizzle-orm/schema.ts: generate migration SQL, then apply to DB (same as db:generate + db:migrate).
schema-change-migration:
	npm run db:generate -w @reporter/core
	$(MAKE) db:migrate

# Open an interactive psql session against the in-cluster Postgres pod.
# Uses POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB environment variables inside the container.
db\:psql:
	kubectl exec -it -n default cl-reporter-db-statefulset-0 -- sh -c 'PGPASSWORD="$$POSTGRES_PASSWORD" psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB"'