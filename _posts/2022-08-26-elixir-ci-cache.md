---
layout: post
title: On Caching Elixir Beam files in CI
tags: elixir
date: 2022-08-26 23:26 +0530
---
Nowadays it's a standard practice to cache dependencies and compiled
artifacts to improve build time on CI server. For Elixir apps, this
would mean caching the contents of `_build` and `deps`. The compiler
is smart enough to figure out what needs to be recompiled. This setup
was working well except for one annoying issue.

Sometimes our test suite would pass, but the final code calculation
coverage part computation would fail. We were just using `--cover`,
which is a standard coverage tool supported by the Elixir.

```
** (MatchError) no match of right hand side value: {:error, {:no_source_code_found, Myapp.Model.Name}}
    (mix 1.13.4) lib/mix/tasks/test.coverage.ex:290: anonymous fn/3 in Mix.Tasks.Test.Coverage.html/2
    (elixir 1.13.4) lib/enum.ex:2396: Enum."-reduce/3-lists^foldl/2-0-"/3
    (mix 1.13.4) lib/mix/tasks/test.coverage.ex:289: Mix.Tasks.Test.Coverage.html/2
```

I initially thought there is something wrong with the module because
each time it would fail with the same module name. Usually, clearing
the CI cache would solve the problem. Initial attempts to reproduce
the issue locally were not successful. The problem was pretty annoying
though, as if dealing with non deterministic test failures in CI is
not enough, now we had to deal with test coverage failures as well.

I copied the contents of `_build` and `deps` to my dev machine and ran
the same command. Sure enough, the test passed, but the coverage
failed. Finally, I have a reliable way to reproduce the issue
locally. I start to trace the function calls using `recon_trace` and
finally ended up on the [line](https://github.com/erlang/otp/blob/0ba102993c8f5f382ed6790071891a95c3a5a4af/lib/tools/src/cover.erl#L2547) on otp cover module which would
explain the whole thing.

```
iex(2)> GenServer.module_info(:compile)
[
  version: '8.0.4',
  options: [:no_spawn_compiler_process, :from_core, :no_core_prepare,
   :no_auto_import],
  source: '/build/source/lib/elixir/lib/gen_server.ex'
]
```

Each compiled beam module stores some information and it's exposed via
`module_info/1` function. The absolute path of the source file is one
of them and this is where our problem starts. I mentioned in the
beginning that we cache compiled beam files. So the compilation would
happen on one machine and the code might be used for another build on
another machine. We use Gitlab for our CI build server, and Gitlab by
default uses the format
`{builds_dir}/$RUNNER_TOKEN_KEY/$CONCURRENT_ID/$NAMESPACE/$PROJECT_NAME`
(example `/builds/2mn-ncv-/0/user/playground`). The coverage tool
tries to fetch the source code and of course, the source won't be
there if the beam file was compiled in different machine.

The fix for the issue is simple once the cause is known. Gitlab allows
the [GIT\_CLONE\_PATH](https://docs.gitlab.com/ee/ci/runners/configure_runners.html#custom-build-directories) to be configured to a static path and it is
safe to do in our as we as were already using k8s runners. So even if
the build the cache on different machine, the source code path would
be same since we checkout the source to a static path.
