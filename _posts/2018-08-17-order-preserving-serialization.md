---
container: order-layout
layout: post
title: Sort order preserving serialization
tags: foundationdb encoding
---

[FoundationDB](https://www.foundationdb.org/) is a distributed
key-value store. From the database perspective, both keys and values
are just bytes. Keys are sorted lexicographically and different
chunks are assigned to different servers. Because of this locality
property, the [range read](https://apple.github.io/foundationdb/developer-guide.html#range-reads)
operation is efficient as most of the time the client would be able to
fetch the data from a single server.

As the keys are just bytes, the application must serialize the keys
and more importantly if we need to use range operation, then the
serialization should preserve the order of the keys. Fortunately, all
the clients implement the [tuple
layer](https://github.com/apple/foundationdb/blob/master/design/tuple.md)
which has this property. This post attempts to explain how various
data types are encoded in a way that preserves their natural sort order.

I will represent bytes using their hex format for the rest of the blog
post. Each data type is tagged with an identifier which uniquely
identifies the type.

### NUll

Null is encoded with the tag <tag>00</tag>

### Byte String

Tag <tag>01</tag> is used for byte string. <term>00</term> is used as
the terminator and <byte>00</byte> inside the byte string are escaped by replacing them
with <byte>00</byte><escape>FF</escape>. For example the byte string <byte>AB</byte><byte>CD</byte><byte>EF</byte> would be encoded as <tag>01</tag><byte>AB</byte><byte>CD</byte><byte>EF</byte><term>00</term>.

It's clear that order would be preserved for byte strings without <byte>00</byte>
because the same constant values are prefixed and suffixed for all the
byte strings. Let's consider all the possible cases of byte strings
with <byte>00</byte>.

<div>
<div class='left'><byte>AB</byte><byte>00</byte><byte>DD</byte> </div><tag>01</tag><byte>AB</byte><byte>00</byte><escape>FF</escape><byte>DD</byte><term>00</term><br>
<div class='left'><byte>AB</byte><byte>01</byte><byte>DD</byte> </div><tag>01</tag><byte>AB</byte><byte>01</byte><byte>DD</byte><term>00</term><br><br>

<div class='left'><byte>AB</byte><byte>00</byte><byte>BC</byte></div><tag>01</tag><byte>AB</byte><byte>00</byte><escape>FF</escape><byte>BC</byte><term>00</term><br>
<div class='left'><byte>AB</byte><byte>00</byte><byte>DD</byte></div><tag>01</tag><byte>AB</byte><byte>00</byte><escape>FF</escape><byte>DD</byte><term>00</term><br><br>


<div class='left'><byte>AB</byte><byte>00</byte><byte>DD</byte></div><tag>01</tag><byte>AB</byte><byte>00</byte><escape>FF</escape><byte>DD</byte><term>00</term><br>
<div class='left'><byte>AB</byte><byte>01</byte></div><tag>01</tag><byte>AB</byte><byte>01</byte><term>00</term><br><br>

<div class='left'><byte>AB</byte><byte>00</byte></div><tag>01</tag><byte>AB</byte><byte>00</byte><escape>FF</escape><term>00</term><br>
<div class='left'><byte>AB</byte><byte>01</byte><byte>DD</byte></div><tag>01</tag><byte>AB</byte><byte>01</byte><byte>DD</byte><term>00</term><br><br>

<div class='left'><byte>AB</byte></div><tag>01</tag><byte>AB</byte><term>00</term><br>
<div class='left'><byte>AB</byte><byte>00</byte> </div><tag>01</tag><byte>AB</byte><byte>00</byte><escape>FF</escape><term>00</term><br><br>
</div>

Because the terminator <term>00</term> has the lowest byte value and if
the compared byte string has any value other than <byte>00</byte> in the same
position then there is no need to consider the rest of the bytes. The
last case shown is a bit tricky and there is a reason for choosing <escape>FF</escape> as
the escape value and it will become more apparent when we consider Tuple types.

### Integer

Integers upto 8 bytes are supported. Integers get encoded into
variable size which depends on minium bytes required to represent
the integer. Tags <tag>0C</tag> to <tag>13</tag> are used for negative numbers and tag <tag>14</tag> for
zero and tags <tag>15</tag> to <tag>1C</tag> are used for positive number.


For positive integers, [big-endian byte
order](https://en.wikipedia.org/wiki/Endianness#Big-endian) is used
which naturally preserves the sort order. For negative integers, the
sign is removed and bit complement of big-endian byte order is used
`bit-complement(big-endian(abs(n)))`. The bit complement operation
reverses the sort order. If two integers get encoded into different
sized bytes, then the order would be preserved by tag values. The tag
value increases as the integer value increases.

<div>
<div class='left-number'><code>-98344948949494949</code> </div> <tag>0C</tag><byte>FEA29BCA3C69535A</byte><br>
<div class='left-number'><code>-303040404040</code> </div> <tag>0F</tag><byte>B9716265B7</byte><br>
<div class='left-number'><code>-20404</code> </div> <tag>12</tag><byte>B0</byte><byte>4B</byte><br>
<div class='left-number'><code>-42</code> </div> <tag>13</tag><byte>D5</byte><br>
<div class='left-number'><code>42</code> </div> <tag>15</tag><byte>2A</byte><br>
<div class='left-number'><code>20404</code> </div> <tag>16</tag><byte>4FB4</byte><br>
<div class='left-number'><code>303040404040</code> </div> <tag>19</tag><byte>468E9D9A48</byte><br>
<div class='left-number'><code>98344948949494949</code> </div> <tag>1C</tag><byte>015D6435C396ACA5</byte>
</div>


### Float

Tags <tag>20</tag> (32 bits) and <tag>21</tag> (64 bits) are used for floating point numbers.

```elixir
def transform(<<sign::big-integer-size(8), rest::binary>> = full) do
  if (sign &&& 0x80) != 0x00 do
    :binary.bin_to_list(full)
    |> Enum.map(fn e -> 0xFF ^^^ e end)
    |> IO.iodata_to_binary()
  else
    <<0x80 ^^^ sign>> <> rest
  end
end
```

The value is first encoded in IEEE 754 binary format. For positive
numbers just the sign bit should be flipped and for negative numbers
all the bits should be flipped. This should provide [total
order](https://stackoverflow.com/questions/43299299/sorting-floating-point-values-using-their-byte-representation)
as per the IEEE specification.

### Tuple

Because of the way other values are encoded, a tuple can be encoded
just by concatenating the encoded values. Note that the sort order is
preserved only between values of same types. Specially comparison
between types like Float and Integer won't work.

<div>
<div class='left-number'><code>(</code><byte>AB</byte><code>, 42)</code></div> <tag>01</tag><byte>AB</byte><term>00</term><tag>15</tag><byte>2A</byte><br>
<div class='left-number'><code>(</code><byte>AB</byte><byte>00</byte><code>, 42)</code></div> <tag>01</tag><byte>AB</byte><byte>00</byte><escape>FF</escape><term>00</term><tag>15</tag><byte>2A</byte><br><br>
</div>

This example illustrates why <escape>FF</escape> is chosen as the
escape character. As long as we don't use <tag>FF</tag> as the tag for
any type, the byte string value <byte>00</byte> and the terminator
value <term>00</term> would not conflict and break the sort
order. Other types don't introduce these kinds of behaviors because
they are either of fixed size or in case of Integer, the tag will
determine the order of the values if they are of different size.

### Nested Tuple

Tuple type can't be nested as there is no difference between `(1, (2,
3))` and `(1, 2, (3))`. Both values would get encoded as the same as
the flattened tuple `(1, 2, 3)`. Nested tuple, as the name implies
supports arbitrary nesting. `[` is used to represent nested tuple.

Tag <tag>05</tag> and terminator <term>00</term> are used for nested
tuple. Encoded values are concatenated and any Null values are escaped
as <tag>00</tag><escape>FF</escape>.

<div>
<div class='left-number'><code>[1, [2, 3]]</code></div> <tag>05</tag><tag>15</tag><byte>01</byte><tag>05</tag><tag>15</tag><byte>02</byte><tag>15</tag><byte>03</byte><term>00</term><term>00</term><br>
<div class='left-number'><code>[1, 2, [3]]</code></div> <tag>05</tag><tag>15</tag><byte>01</byte><tag>15</tag><byte>02</byte><tag>05</tag><tag>15</tag><byte>03</byte><term>00</term><term>00</term><br><br>
</div>

There are other data types like unicode string, arbitrary precision
number, UUID, boolean etc, but all of them follow similar principles
discussed so far. As such, they are not considered here.


<link rel="stylesheet" href="/public/css/order-preserving.css"/>
