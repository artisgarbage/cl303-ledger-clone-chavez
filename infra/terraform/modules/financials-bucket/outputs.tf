output "bucket_name" {
  value = google_storage_bucket.financials.name
}

output "bucket_url" {
  value = google_storage_bucket.financials.url
}
