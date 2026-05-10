output "keyring_id" {
  value = google_kms_key_ring.main.id
}

output "cmek_key_id" {
  value = google_kms_crypto_key.cmek.id
}

output "cmek_key_name" {
  value = google_kms_crypto_key.cmek.name
}
