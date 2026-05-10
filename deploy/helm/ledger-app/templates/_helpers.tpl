{{/*
Expand the name of the chart.
*/}}
{{- define "ledger-app.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "ledger-app.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- printf "%s" $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Chart label.
*/}}
{{- define "ledger-app.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels.
*/}}
{{- define "ledger-app.labels" -}}
helm.sh/chart: {{ include "ledger-app.chart" . }}
{{ include "ledger-app.selectorLabels" . }}
app.kubernetes.io/version: {{ .Values.image.tag | default .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels.
*/}}
{{- define "ledger-app.selectorLabels" -}}
app.kubernetes.io/name: {{ include "ledger-app.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Service account name.
*/}}
{{- define "ledger-app.serviceAccountName" -}}
{{- default (include "ledger-app.fullname" .) .Values.serviceAccount.name }}
{{- end }}

{{/*
Image reference — fails if tag is not set (no :latest).
*/}}
{{- define "ledger-app.image" -}}
{{- $tag := required "image.tag is required (set to the git SHA of the build)" .Values.image.tag }}
{{- printf "%s:%s" .Values.image.repository $tag }}
{{- end }}

{{/*
Cloud SQL connection name for the proxy sidecar.
*/}}
{{- define "ledger-app.sqlConnectionName" -}}
{{- required "cloudSql.connectionName is required" .Values.cloudSql.connectionName }}
{{- end }}
