# SnapShare: Photo App Scaling Plan

## 1. Assumptions and Daily Active Users

SnapShare is a photo-sharing application where users upload photos and view a feed of photos from people they follow.

The following assumptions are used:

- Total registered users: 10,000,000.
- Daily active users (DAU): 10% of registered users.
- Each active user uploads 1 photo per day.
- Each active user views 50 feed pages per day.
- Average original photo size: 2 MB.
- Each photo also has one thumbnail of 50 KB.
- The system operates 365 days per year.
- Average request rates are calculated over 24 hours.
- Peak feed traffic is estimated at 5 times the average rate.
- Storage estimates exclude backups, replication, and other overhead.

**Daily active users:**

DAU = 10,000,000 × 10% = **1,000,000 users per day**.

## 2. Traffic and Storage Calculations

### Uploads per second

Each daily active user uploads one photo per day.

Daily uploads = 1,000,000 × 1 = 1,000,000 photos.

Average uploads per second = 1,000,000 ÷ 86,400 = **11.57 uploads per second**, approximately 12.

### Feed views per second

Each daily active user views 50 feed pages per day.

Daily feed views = 1,000,000 × 50 = 50,000,000 feed views.

Average feed views per second = 50,000,000 ÷ 86,400 = **578.7 feed views per second**.

Peak feed views per second = 578.7 × 5 = **2,893.5 feed views per second**, approximately 2,894.

### Photo storage per year

Original photo storage per day:

1,000,000 × 2 MB = 2,000,000 MB, or 2 TB per day using decimal units.

Original photo storage per year:

2 TB × 365 = **730 TB per year**.

Thumbnail storage per day:

1,000,000 × 50 KB = 50,000,000 KB, or 50 GB per day.

Thumbnail storage per year:

50 GB × 365 = **18.25 TB per year**.

Total photo and thumbnail storage per year:

730 TB + 18.25 TB = **748.25 TB per year**.

Therefore, SnapShare needs approximately 748.25 TB of new object storage annually, before accounting for backups, replication, and overhead.

## 3. Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system** because users view 50 feed pages for every photo they upload. It handles 50 million feed views but only 1 million photo uploads per day.

The architecture should prioritize fast feed loading by using a CDN, caching frequently requested data, and a database read replica. App servers should be horizontally scalable so additional servers can handle increased traffic. Upload processing should happen asynchronously where possible so creating thumbnails does not delay the user.

## 4. Where Should Photos Be Stored?

Photos should be stored in object storage rather than directly inside the database. Large binary files increase database storage requirements, backups, and query overhead, making routine database operations more expensive and difficult to scale.

Object storage is designed to store large files reliably and cost-effectively. The original photos and thumbnails can be stored there, while the database stores metadata such as photo ID, owner ID, caption, upload time, storage key, and thumbnail key. The CDN can then deliver frequently requested images closer to users.

## 5. Architecture Diagram

```text
                 +------------------+
                 |   Mobile / Web   |
                 |      Clients     |
                 +--------+---------+
                          |
                          v
                 +------------------+
                 |       CDN        |
                 | Cached Images    |
                 +--------+---------+
                          |
                          v
                 +------------------+
                 |  Load Balancer   |
                 +--------+---------+
                          |
              +-----------+-----------+
              |           |           |
              v           v           v
        +-----------+ +-----------+ +-----------+
        | App Server| | App Server| | App Server|
        +-----+-----+ +-----+-----+ +-----+-----+
              |             |             |
              +-------------+-------------+
                            |
                +-----------+-----------+
                |                       |
                v                       v
         +--------------+       +------------------+
         | Cache        |       | Primary Database |
         | Feed / Data  |       | Users / Metadata |
         +--------------+       +--------+---------+
                                         |
                                         v
                                +------------------+
                                | Database Read    |
                                | Replica           |
                                +------------------+

        App Servers --------------------> Object Storage
                                           Original Photos
                                           Thumbnails
                                                ^
                                                |
                                      +---------+---------+
                                      | Thumbnail Worker  |
                                      +---------+---------+
                                                ^
                                                |
                                      +---------+---------+
                                      |    Job Queue      |
                                      +-------------------+
```

The app servers write photo metadata to the primary database, and the primary database replicates data to the read replica. The queue receives thumbnail jobs from the app servers, and the worker reads original photos from object storage before saving generated thumbnails there.

## 6. Components and the Problems They Solve

- **Clients:** Mobile and web clients allow users to upload photos and browse their feeds.
- **CDN:** A content delivery network caches and serves photos from locations closer to users, reducing latency and origin-server traffic.
- **Load balancer:** Distributes incoming requests across healthy app servers to prevent one server from becoming overloaded.
- **App servers:** Handle authentication, permissions, feed requests, photo metadata, and upload coordination.
- **Cache:** Stores frequently accessed feed data and metadata to reduce repeated database queries.
- **Primary database:** Stores authoritative user, follow, and photo metadata and handles writes.
- **Read replica:** Serves suitable read queries so feed traffic puts less pressure on the primary database.
- **Object storage:** Stores original photos and thumbnails without filling the database with large binary files.
- **Job queue:** Holds thumbnail-generation tasks so image processing can happen asynchronously.
- **Thumbnail worker:** Processes queued jobs, creates smaller image versions, and stores the resulting thumbnails.

## 7. Photo Upload Flow

1. A user signs in and selects a photo to upload.
2. The client asks an app server to begin the upload, and the server checks authentication, permissions, and upload limits.
3. The app server provides a secure, time-limited upload URL for object storage.
4. The client uploads the original photo directly to object storage, reducing the amount of large-file traffic passing through the app servers.
5. After the upload is confirmed, the app server records the photo metadata and storage key in the primary database.
6. The app server adds a thumbnail-generation job to the queue.
7. The client receives confirmation that the photo has been uploaded; the thumbnail can finish processing in the background.
8. A thumbnail worker retrieves the original photo from object storage, generates a 50 KB thumbnail, and saves it to object storage.
9. The worker updates the relevant metadata or processing status in the database.
10. When followers request their feeds, the app servers retrieve suitable feed data from the cache or database and return image URLs that the CDN can use to deliver the photos.

If thumbnail generation fails, the queued job can be retried without requiring the user to upload the original photo again.

## 8. Trade-Offs

### Trade-off 1: Caching versus fresh data

Caching makes feeds faster and reduces database load, but cached information can become outdated. SnapShare can use short cache lifetimes and invalidate relevant cache entries when important data changes.

### Trade-off 2: Asynchronous thumbnail generation versus immediate availability

A queue keeps uploads responsive and allows workers to process jobs independently, but a thumbnail may not be available immediately after an upload. The app can display a placeholder until the thumbnail is ready and retry failed jobs.

### Trade-off 3: Read replicas versus consistency

A read replica increases read capacity, but replication delays can mean that a recently uploaded photo does not immediately appear in every feed. The application can read recent changes from the primary database when immediate consistency is important.

### Trade-off 4: Storage cost versus image quality

Keeping original photos preserves quality but increases storage costs. Generating thumbnails reduces bandwidth and speeds up feed loading, but thumbnails have less detail than the originals. SnapShare can retain originals in object storage and serve thumbnails for ordinary feed browsing.

## 9. Conclusion

SnapShare starts with 1 million daily active users, approximately 11.57 uploads per second, 578.7 average feed views per second, and a projected peak of about 2,894 feed views per second. It needs approximately 748.25 TB of additional storage each year for original photos and thumbnails.

A read-heavy, horizontally scalable architecture using a CDN, load balancer, app servers, cache, primary database with a read replica, object storage, and an asynchronous thumbnail queue provides a practical foundation for handling growth. Monitoring traffic, storage usage, cache hit rates, and queue delays will help guide future scaling decisions.