---
layout: post
title: Understanding N + 1 queries problem
tags: ruby rails
date: 2023-01-01 16:59 +0530
---
In this post, I am going to talk about the N + 1 queries
problem. While trying to solve this problem myself recently, I noticed
most of the blog posts only talk about the very simple version of the
problem and the proposed solutions would break down when the use cases
get complex. I will try to get into more depth and hopefully, you will
leave with a better mental model of the problem.


### Setup

<img src="/public/images/n_plus_1/erd.png" />

Assume we need to create an endpoint that needs to return the last 3
blog posts, along with their comments and the comments vote count. We
will start with a straightforward approach. Let's define a controller
action, which loads the last 3 posts.

```ruby
def latest
  @posts = Post.order(created_at: :desc).limit(3)
  render json: @posts
end
```

I will use the [ActiveModelSerializer](https://github.com/rails-api/active_model_serializers) gem in this example, but
anything similar should work. Let's add the attributes and specify the
comments association in the PostSerializer.

```ruby
class PostSerializer < ActiveModel::Serializer
  attributes :id, :title, :content

  has_many :comments
end
```

In the CommentSerializer, let's include the votes count and other
fields. The votes count is calculated using the ActiveRecord
collection count method.

```ruby
class CommentSerializer < ActiveModel::Serializer
  attributes :id, :content, :votes_count

  def votes_count
    object.votes.count
  end
end
```

Let's hit the endpoint to see how the data is fetched from the database.


<pre class="small" style="color: #657b83; background-color: #fdf6e3;">
Started GET "/posts/latest" for 127.0.0.1 at 2023-01-01 13:05:42 +0530
Processing by PostsController#latest as */*
  <span style="color: #2aa198; font-weight: bold;">Post Load (0.1ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "posts".* FROM "posts" ORDER BY "posts"."created_at" DESC LIMIT ?</span>  [["LIMIT", 3]]
  &#8627; app/controllers/posts_controller.rb:11:in `latest'
[active_model_serializers]   <span style="color: #2aa198; font-weight: bold;">Comment Load (0.0ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "comments".* FROM "comments" WHERE "comments"."post_id" = ?</span>  [["post_id", 3]]
<span style="color: #cb4b16; background-color: #fdf6e3;">[active_model_serializers]   &#8627; app/controllers/posts_controller.rb</span><span style="color: #657b83; background-color: #fdf6e3;">:</span><span style="color: #859900; background-color: #fdf6e3;">11</span><span style="color: #657b83; background-color: #fdf6e3;">:i</span>n `latest'
[active_model_serializers]   <span style="color: #2aa198; font-weight: bold;">Comment Load (0.0ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "comments".* FROM "comments" WHERE "comments"."post_id" = ?</span>  [["post_id", 2]]
<span style="color: #cb4b16; background-color: #fdf6e3;">[active_model_serializers]   &#8627; app/controllers/posts_controller.rb</span><span style="color: #657b83; background-color: #fdf6e3;">:</span><span style="color: #859900; background-color: #fdf6e3;">11</span><span style="color: #657b83; background-color: #fdf6e3;">:i</span>n `latest'
[active_model_serializers]   <span style="color: #2aa198; font-weight: bold;">Comment Load (0.0ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "comments".* FROM "comments" WHERE "comments"."post_id" = ?</span>  [["post_id", 1]]
<span style="color: #cb4b16; background-color: #fdf6e3;">[active_model_serializers]   &#8627; app/controllers/posts_controller.rb</span><span style="color: #657b83; background-color: #fdf6e3;">:</span><span style="color: #859900; background-color: #fdf6e3;">11</span><span style="color: #657b83; background-color: #fdf6e3;">:i</span>n `latest'
[active_model_serializers]   <span style="color: #2aa198; font-weight: bold;">Vote Count (0.1ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT COUNT(*) FROM "votes" WHERE "votes"."comment_id" = ?</span>  [["comment_id", 3]]
<span style="color: #cb4b16; background-color: #fdf6e3;">[active_model_serializers]   &#8627; app/serializers/comment_serializer.rb</span><span style="color: #657b83; background-color: #fdf6e3;">:</span><span style="color: #859900; background-color: #fdf6e3;">5</span><span style="color: #657b83; background-color: #fdf6e3;">:i</span>n `votes_count'
[active_model_serializers]   <span style="color: #2aa198; font-weight: bold;">Vote Count (0.0ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT COUNT(*) FROM "votes" WHERE "votes"."comment_id" = ?</span>  [["comment_id", 1]]
<span style="color: #cb4b16; background-color: #fdf6e3;">[active_model_serializers]   &#8627; app/serializers/comment_serializer.rb</span><span style="color: #657b83; background-color: #fdf6e3;">:</span><span style="color: #859900; background-color: #fdf6e3;">5</span><span style="color: #657b83; background-color: #fdf6e3;">:i</span>n `votes_count'
[active_model_serializers]   <span style="color: #2aa198; font-weight: bold;">Vote Count (0.0ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT COUNT(*) FROM "votes" WHERE "votes"."comment_id" = ?</span>  [["comment_id", 2]]
<span style="color: #cb4b16; background-color: #fdf6e3;">[active_model_serializers]   &#8627; app/serializers/comment_serializer.rb</span><span style="color: #657b83; background-color: #fdf6e3;">:</span><span style="color: #859900; background-color: #fdf6e3;">5</span><span style="color: #657b83; background-color: #fdf6e3;">:i</span>n `votes_count'
[active_model_serializers] Rendered ActiveModel::Serializer::CollectionSerializer with ActiveModelSerializers::Adapter::Attributes (9.2ms)
Completed 200 OK in 13ms (Views: 10.5ms | ActiveRecord: 1.1ms | Allocations: 19123)


</pre>


### Problem

We can immediately notice the N + 1 queries. We are making 7 queries
in total, but ideally, it should be done in 3 queries. Before we jump
into solutions, let's spend more time trying to get a better mental
model of the problem.

<img style="margin: auto" width="250" src="/public/images/n_plus_1/depth-first.png" />

The above diagram captures the sequence of queries run by the
system. If you notice the sequence, it kind of mirrors the way we have
written the code. We have written two serializers, each knows how to
serialize an individual model. The post serializer knows how to
serialize a **single** post, the comment serializer knows how to
serialize a single comment and calculate the votes count for a single
comment.

In other words, we have written the code in a depth-first approach,
where a node knows how to serialize itself and immediate children, but
does not know much about the parent and grandchildren. This is the
natural and simple way that composes well and keeps the dependencies
of a serializer to a minimum.

<img style="margin: auto" height="300"
src="/public/images/n_plus_1/breadth-first.png" />

If we do the queries optimally, we could do it in 3 queries, the above
diagram captures the sequence of the queries. I am hoping the diagram
also hints at the obvious solution: **breadth-first** loading. The
ideal solution requires us to load the data in a breadth-first
approach, but unfortunately, this is harder to write because it does
not compose well. I will talk more about this in the next section, you
will notice the code becomes more complicated as we optimize the
queries.

### Band-Aid Solution

I am going to call this a band-aid solution because it's ugly. But a
band-aid solution is better than nothing, and I will share some
thoughts about what the ideal solution might look like later.

Let's try to fix the comment queries first, you might already know the
solution. The problem is so common, ActiveRecord has a way to preload
association. `includes(:comments)` will preload all the comments
associated with all the posts.

```ruby
def latest
  @posts = Post.includes(:comments).order(created_at: :desc).limit(3)
  render json: @posts
end
```

This solves the comments loading problem.

<pre class="small" style="color: #657b83; background-color: #fdf6e3;">
Started GET "/posts/latest" for 127.0.0.1 at 2023-01-01 13:07:34 +0530
Processing by PostsController#latest as */*
  <span style="color: #2aa198; font-weight: bold;">Post Load (0.1ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "posts".* FROM "posts" ORDER BY "posts"."created_at" DESC LIMIT ?</span>  [["LIMIT", 3]]
  &#8627; app/controllers/posts_controller.rb:11:in `latest'
  <span style="color: #2aa198; font-weight: bold;">Comment Load (0.1ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "comments".* FROM "comments" WHERE "comments"."post_id" IN (?, ?, ?)</span>  [["post_id", 3], ["post_id", 2], ["post_id", 1]]
  &#8627; app/controllers/posts_controller.rb:11:in `latest'
[active_model_serializers]   <span style="color: #2aa198; font-weight: bold;">Vote Count (0.0ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT COUNT(*) FROM "votes" WHERE "votes"."comment_id" = ?</span>  [["comment_id", 3]]
<span style="color: #cb4b16; background-color: #fdf6e3;">[active_model_serializers]   &#8627; app/serializers/comment_serializer.rb</span><span style="color: #657b83; background-color: #fdf6e3;">:</span><span style="color: #859900; background-color: #fdf6e3;">5</span><span style="color: #657b83; background-color: #fdf6e3;">:i</span>n `votes_count'
[active_model_serializers]   <span style="color: #2aa198; font-weight: bold;">Vote Count (0.0ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT COUNT(*) FROM "votes" WHERE "votes"."comment_id" = ?</span>  [["comment_id", 1]]
<span style="color: #cb4b16; background-color: #fdf6e3;">[active_model_serializers]   &#8627; app/serializers/comment_serializer.rb</span><span style="color: #657b83; background-color: #fdf6e3;">:</span><span style="color: #859900; background-color: #fdf6e3;">5</span><span style="color: #657b83; background-color: #fdf6e3;">:i</span>n `votes_count'
[active_model_serializers]   <span style="color: #2aa198; font-weight: bold;">Vote Count (0.0ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT COUNT(*) FROM "votes" WHERE "votes"."comment_id" = ?</span>  [["comment_id", 2]]
<span style="color: #cb4b16; background-color: #fdf6e3;">[active_model_serializers]   &#8627; app/serializers/comment_serializer.rb</span><span style="color: #657b83; background-color: #fdf6e3;">:</span><span style="color: #859900; background-color: #fdf6e3;">5</span><span style="color: #657b83; background-color: #fdf6e3;">:i</span>n `votes_count'
[active_model_serializers] Rendered ActiveModel::Serializer::CollectionSerializer with ActiveModelSerializers::Adapter::Attributes (4.42ms)
Completed 200 OK in 11ms (Views: 8.7ms | ActiveRecord: 1.0ms | Allocations: 16355)
</pre>

But the votes count problem remains. I can't find any straightforward
way to solve this problem via ActiveRecord, in fact, I selected this
because I want to show how to solve this issue in a general way.

#### Attempt 1

```ruby
def latest
  @posts = Post.includes(:comments).order(created_at: :desc).limit(3)
  @comment_votes_count = Vote
                           .where(comment_id: @posts.flat_map(&:comment_ids))
                           .group(:comment_id)
                           .pluck('comment_id', Arel.sql('count(id)'))
                           .to_h
  render json: @posts, comment_votes_count: @comment_votes_count
end
```

```ruby
class CommentSerializer < ActiveModel::Serializer
  attributes :id, :content, :votes_count

  def votes_count
    instance_options[:comment_votes_count][object.id]
  end
end
```

<pre class="small" style="color: #657b83; background-color: #fdf6e3;">
Started GET "/posts/latest" for 127.0.0.1 at 2023-01-01 13:09:59 +0530
Processing by PostsController#latest as */*
  <span style="color: #2aa198; font-weight: bold;">Post Load (0.1ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "posts".* FROM "posts" ORDER BY "posts"."created_at" DESC LIMIT ?</span>  [["LIMIT", 3]]
  &#8627; app/controllers/posts_controller.rb:12:in `flat_map'
  <span style="color: #2aa198; font-weight: bold;">Comment Load (0.1ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "comments".* FROM "comments" WHERE "comments"."post_id" IN (?, ?, ?)</span>  [["post_id", 3], ["post_id", 2], ["post_id", 1]]
  &#8627; app/controllers/posts_controller.rb:12:in `flat_map'
  <span style="color: #2aa198; font-weight: bold;">Vote Pluck (0.1ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "votes"."comment_id", count(id) FROM "votes" WHERE "votes"."comment_id" IN (?, ?, ?) GROUP BY "votes"."comment_id"</span>  [["comment_id", 3], ["comment_id", 1], ["comment_id", 2]]
  &#8627; app/controllers/posts_controller.rb:14:in `latest'
[active_model_serializers] Rendered ActiveModel::Serializer::CollectionSerializer with ActiveModelSerializers::Adapter::Attributes (1.42ms)
Completed 200 OK in 10ms (Views: 2.0ms | ActiveRecord: 0.9ms | Allocations: 12825)
</pre>


This solution works, but it's very ugly. The CommentSerializer is not
self-contained anymore, and it expects the caller to pass in the vote
count. So we have essentially spread the logic across many places and
made the code hard to understand.

#### Attempt 2

```ruby
gem 'batch-loader'
```

Let's add a new gem called [batch-loader](https://github.com/exAspArk/batch-loader) and update the comment
model.

```ruby
class Comment < ApplicationRecord
  belongs_to :post
  has_many :votes

  def lazy_votes_count
    BatchLoader.for(id)
      .batch(key: 'comment_votes_count') do |comment_ids, loader|
      Vote
        .where(comment_id: comment_ids)
        .group(:comment_id)
        .pluck('comment_id', Arel.sql('count(id)'))
        .each { |comment_id, count| loader.call(comment_id, count) }
    end
  end
end
```

Let's go step by step. We added a new method called
`lazy_votes_count`. Instead of specifying how to calculate the
votes\_count for a single comment, we are specifying how to do it for
a list of comments. This is essential complexity, there is no way
around it. It's not possible to magically derive a query to load
multiple objects except for a few simple cases that are currently
supported by ActiveRecord `includes`.

There is one big difference compared to the previous approach, we are
not specifying how to collect the comment ids. Let's update the
CommentSerializer to use the new method and revert the changes made to
the controller

```ruby
class CommentSerializer < ActiveModel::Serializer
  attributes :id, :content, :votes_count

  def votes_count
    object.lazy_votes_count
  end
end
```

```ruby
def latest
  @posts = Post.order(created_at: :desc).limit(3)
  render json: @posts
end
```

<pre class="small" style="color: #657b83; background-color: #fdf6e3;">
Started GET "/posts/latest" for 127.0.0.1 at 2023-01-01 13:28:49 +0530
Processing by PostsController#latest as */*
  <span style="color: #2aa198; font-weight: bold;">Post Load (0.1ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "posts".* FROM "posts" ORDER BY "posts"."created_at" DESC LIMIT ?</span>  [["LIMIT", 3]]
  &#8627; app/controllers/posts_controller.rb:11:in `latest'
  <span style="color: #2aa198; font-weight: bold;">Comment Load (0.1ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "comments".* FROM "comments" WHERE "comments"."post_id" IN (?, ?, ?)</span>  [["post_id", 3], ["post_id", 2], ["post_id", 1]]
  &#8627; app/controllers/posts_controller.rb:11:in `latest'
[active_model_serializers]   <span style="color: #2aa198; font-weight: bold;">Vote Pluck (0.1ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "votes"."comment_id", count(id) FROM "votes" WHERE "votes"."comment_id" IN (?, ?, ?) GROUP BY "votes"."comment_id"</span>  [["comment_id", 3], ["comment_id", 1], ["comment_id", 2]]
<span style="color: #cb4b16; background-color: #fdf6e3;">[active_model_serializers]   &#8627; app/models/comment.rb</span><span style="color: #657b83; background-color: #fdf6e3;">:</span><span style="color: #859900; background-color: #fdf6e3;">11</span><span style="color: #657b83; background-color: #fdf6e3;">:i</span>n `block in lazy_votes_count'
[active_model_serializers] Rendered ActiveModel::Serializer::CollectionSerializer with ActiveModelSerializers::Adapter::Attributes (1.87ms)
Completed 200 OK in 4ms (Views: 3.2ms | ActiveRecord: 0.3ms | Allocations: 7451)
</pre>

Before we have time to understand how the batch-loader works under the
hood, we get a new requirement. Instead of returning the votes count
as an integer, the frontend folks want a string like `${i} vote(s)`

```ruby
class CommentSerializer < ActiveModel::Serializer
  attributes :id, :content, :votes_count

  def votes_count
    count = object.lazy_votes_count
    count == 1 ? '1 vote' : "#{count} votes"
  end
end
```

Let's make the update and see what happens. To our surprise, the votes
count reverts back to N + 1 queries.

<pre class="small" style="color: #657b83; background-color: #fdf6e3;">
Started GET "/posts/latest" for 127.0.0.1 at 2023-01-01 14:17:55 +0530
Processing by PostsController#latest as */*
  <span style="color: #2aa198; font-weight: bold;">Post Load (0.1ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "posts".* FROM "posts" ORDER BY "posts"."created_at" DESC LIMIT ?</span>  [["LIMIT", 3]]
  &#8627; app/controllers/posts_controller.rb:11:in `latest'
  <span style="color: #2aa198; font-weight: bold;">Comment Load (0.1ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "comments".* FROM "comments" WHERE "comments"."post_id" IN (?, ?, ?)</span>  [["post_id", 3], ["post_id", 2], ["post_id", 1]]
  &#8627; app/controllers/posts_controller.rb:11:in `latest'
[active_model_serializers]   <span style="color: #2aa198; font-weight: bold;">Vote Pluck (0.1ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "votes"."comment_id", count(id) FROM "votes" WHERE "votes"."comment_id" = ? GROUP BY "votes"."comment_id"</span>  [["comment_id", 3]]
<span style="color: #cb4b16; background-color: #fdf6e3;">[active_model_serializers]   &#8627; app/models/comment.rb</span><span style="color: #657b83; background-color: #fdf6e3;">:</span><span style="color: #859900; background-color: #fdf6e3;">11</span><span style="color: #657b83; background-color: #fdf6e3;">:i</span>n `block in lazy_votes_count'
[active_model_serializers]   <span style="color: #2aa198; font-weight: bold;">Vote Pluck (0.1ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "votes"."comment_id", count(id) FROM "votes" WHERE "votes"."comment_id" = ? GROUP BY "votes"."comment_id"</span>  [["comment_id", 1]]
<span style="color: #cb4b16; background-color: #fdf6e3;">[active_model_serializers]   &#8627; app/models/comment.rb</span><span style="color: #657b83; background-color: #fdf6e3;">:</span><span style="color: #859900; background-color: #fdf6e3;">11</span><span style="color: #657b83; background-color: #fdf6e3;">:i</span>n `block in lazy_votes_count'
[active_model_serializers]   <span style="color: #2aa198; font-weight: bold;">Vote Pluck (0.0ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "votes"."comment_id", count(id) FROM "votes" WHERE "votes"."comment_id" = ? GROUP BY "votes"."comment_id"</span>  [["comment_id", 2]]
<span style="color: #cb4b16; background-color: #fdf6e3;">[active_model_serializers]   &#8627; app/models/comment.rb</span><span style="color: #657b83; background-color: #fdf6e3;">:</span><span style="color: #859900; background-color: #fdf6e3;">11</span><span style="color: #657b83; background-color: #fdf6e3;">:i</span>n `block in lazy_votes_count'
[active_model_serializers] Rendered ActiveModel::Serializer::CollectionSerializer with ActiveModelSerializers::Adapter::Attributes (4.84ms)
Completed 200 OK in 12ms (Views: 9.5ms | ActiveRecord: 0.6ms | Allocations: 18820)
</pre>

Let's take some time and understand how batch-loader works. When the
lazy\_votes\_count method is called, what you get back is a lazy
object, not the real integer. This can be easily verified by placing a
breakpoint and inspecting the votes count value.


<pre style="color: #657b83; background-color: #fdf6e3;">
<span style="font-weight: bold;">Frame number:</span> 0/130

<span style="font-weight: bold;">From:</span> [redacted]/blog/app/serializers/comment_serializer.rb:5 CommentSerializer#votes_count:

    <span style="color: #268bd2; font-weight: bold;">4</span>: <span style="color: #859900;">def</span> <span style="color: #268bd2; font-weight: bold;">votes_count</span>
 =&gt; <span style="color: #268bd2; font-weight: bold;">5</span>:   binding.pry
    <span style="color: #268bd2; font-weight: bold;">6</span>:   object.lazy_votes_count
    <span style="color: #268bd2; font-weight: bold;">7</span>: <span style="color: #859900;">end</span>

[1] pry(#&lt;CommentSerializer&gt;)&gt; object.lazy_votes_count.inspect
=&gt; <span style="color: #dc322f; font-weight: bold;">"</span><span style="color: #dc322f;">#&lt;BatchLoader:0x49960&gt;</span><span style="color: #dc322f; font-weight: bold;">"</span>
[2] pry(#&lt;CommentSerializer&gt;)&gt; object.lazy_votes_count
[active_model_serializers]   <span style="color: #2aa198; font-weight: bold;">Vote Pluck (0.7ms)</span>  <span style="color: #268bd2; font-weight: bold;">SELECT "votes"."comment_id", count(id) FROM "votes" WHERE "votes"."co</span>
<span style="color: #268bd2; font-weight: bold;">mment_id" IN (?, ?) GROUP BY "votes"."comment_id"</span>  [["comment_id", 3]]
[active_model_serializers]   &#8627; app/models/comment.rb:11:in `block in lazy_votes_count'
=&gt; <span style="color: #268bd2; font-weight: bold;">4</span>
</pre>

The inspect method shows the BatchLoader class instead of an
Integer. When we serialize the posts, a plain JSON hash will be
constructed first, typically what is returned when `as_json` is
called. During this phase, `lazy_votes_count` will get called three
times. The batch-loader does not go ahead and fetch the data, instead,
it just keeps track of the value passed to the `for` method and
returns a lazy object. In the second phase, the plain JSON hash will
be converted to string. During this phase, some methods will be get
called on the lazy object, which will trigger the batch load. Since
the batch loader has collected three ids so far, it will call the
callback once with three ids.

Unfortunately, the changes we made has forced the lazy value, and the
batch loader has to load the data right away after having collected a
single id. One way to solve this problem is by using [LazyObject](https://github.com/HornsAndHooves/lazy_object)
directly. LazyObject is implemented by overriding [method_missing](metthod)
callback.

```ruby
class CommentSerializer < ActiveModel::Serializer
  attributes :id, :content, :votes_count

  def votes_count
    count = object.lazy_votes_count
    LazyObject.new { count == 1 ? '1 vote' : "#{count} votes" }
  end
end
```

In my opinion, this solution is better than the first version. It
composes better than the previous solution, as all the changes are
contained in the comment serializer and model. Though, everyone on the
team has to understand how the magic works.


### Ideal Solution

Luckily, this problem is common enough, there is a paper available on
the subject[^1]. In fact, the batch-loader is inspired by the
[Haxl](https://github.com/facebook/Haxl) implementation. batch-loader provides a good abstraction,
but it is still awkward to integrate it with ActiveModelSerializer. I
initially tried to use it with [Blueprinter](https://github.com/procore/blueprinter), but it didn't work
because Blueprinter forces the value [right away](https://github.com/procore/blueprinter/blob/60b8f94616e18aa0346fa3c697b9e30c66c4ec8c/lib/blueprinter/extractors/auto_extractor.rb#L15). The way the
second attempt works might be entirely accidental, it is quite
possible some future changes on ActiveModelSerializer might break it.

I kept remembering [what color is your function](https://journal.stuffwithstuff.com/2015/02/01/what-color-is-your-function/) when thinking of a
solution. The ideal solution would be something that clearly separates
the two parts of the problem. One set of methods that defines the data
load part and another set of methods that handles the serialization
part. Since both share the same structure, they could live under same
class.  The serializer could then do two phases. Phase 1: data would
be loaded. Phase 2: models would get serialized. This split would also
make it easy to catch any unexpected network calls in the second
phase.

<link rel="stylesheet" href="/public/css/n_plus_1.css"/>

[^1]: [There is no Fork](https://simonmar.github.io/bib/papers/haxl-icfp14.pdf): an Abstraction for Efficient, Concurrent, and Concise Data Access
