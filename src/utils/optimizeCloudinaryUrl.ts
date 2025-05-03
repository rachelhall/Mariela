function optimizeCloudinaryUrl(url: string, options = "f_auto,q_auto") {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/"))
    return url;

  return url.replace("/upload/", `/upload/${options}/`);
}
