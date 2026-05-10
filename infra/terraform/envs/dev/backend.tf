terraform {
  backend "gcs" {
    bucket = "codelab303-ledger-tfstate"
    prefix = "terraform/dev"
  }
}
